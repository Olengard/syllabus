# ════════════════════════════════════════════════════════════════
# Migra feed + preferenze dal vecchio Digest (Render) a Supabase pchld.
# Eseguire DOPO dg-migration.sql. Uso:
#   .\migra-dati.ps1 -DigestPassword "lapassword" -ServiceKey "eyJ..."
# ════════════════════════════════════════════════════════════════
param(
  [Parameter(Mandatory=$true)][string]$DigestPassword,
  [Parameter(Mandatory=$true)][string]$ServiceKey
)
$old = 'https://digest-blqp.onrender.com'
$sb  = 'https://pchldmiavycxzpkzochn.supabase.co'

# Token del vecchio Digest = sha256("digest-token:" + password)
$sha = [System.Security.Cryptography.SHA256]::Create()
$bytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes("digest-token:$DigestPassword"))
$token = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
$hOld = @{ Authorization = "Bearer $token" }
$hSb  = @{ apikey=$ServiceKey; Authorization="Bearer $ServiceKey"; 'Content-Type'='application/json'; Prefer='resolution=merge-duplicates' }

# user_id: il primo (unico) utente del progetto
$users = Invoke-RestMethod -Headers @{ apikey=$ServiceKey; Authorization="Bearer $ServiceKey" } -Uri "$sb/auth/v1/admin/users?per_page=5"
$uid = $users.users[0].id
Write-Output "user_id: $uid"

# Feed + categorie (da preferences digest_feed_cats)
$feeds = Invoke-RestMethod -Headers $hOld -Uri "$old/api/feeds"
$prefs = Invoke-RestMethod -Headers $hOld -Uri "$old/api/preferences"
$cats  = @{}
if ($prefs.digest_feed_cats) { $prefs.digest_feed_cats.PSObject.Properties | ForEach-Object { $cats[$_.Name] = $_.Value } }

$rows = @($feeds | ForEach-Object {
  @{ id=$_.id; user_id=$uid; name=$_.name; url=$_.url; color=$_.color
     category = if ($cats.ContainsKey($_.id)) { $cats[$_.id] } else { 'news' } }
})
Invoke-RestMethod -Method Post -Headers $hSb -Uri "$sb/rest/v1/dg_feeds?on_conflict=id" -Body (ConvertTo-Json $rows -Depth 5) | Out-Null
Write-Output "dg_feeds: migrati $($rows.Count) feed"

# Preferenze (feed prioritari, ultimi digest) — salta digest_feed_cats (ora colonna)
$prefRows = @()
$prefs.PSObject.Properties | Where-Object { $_.Name -ne 'digest_feed_cats' } | ForEach-Object {
  $prefRows += @{ user_id=$uid; key=$_.Name; value=$_.Value }
}
if ($prefRows.Count -gt 0) {
  Invoke-RestMethod -Method Post -Headers $hSb -Uri "$sb/rest/v1/dg_preferences?on_conflict=user_id,key" -Body (ConvertTo-Json $prefRows -Depth 10) | Out-Null
  Write-Output "dg_preferences: migrate $($prefRows.Count) chiavi"
}
Write-Output 'Fatto.'
