# ════════════════════════════════════════════════════════════════
# Migra feed + preferenze dal vecchio Digest (Render) a Supabase pchld.
# Eseguire DOPO dg-migration.sql. Uso:
#   .\migra-dati.ps1 -DigestPassword "lapassword" -ServiceKey "eyJ..."
# Se la password contiene $ o ` usare gli apici SINGOLI: -DigestPassword 'pa$$word'
# ════════════════════════════════════════════════════════════════
param(
  [Parameter(Mandatory=$true)][string]$DigestPassword,
  [Parameter(Mandatory=$true)][string]$ServiceKey,
  [string]$Email = 'olengard@gmail.com'
)
$ErrorActionPreference = 'Stop'
$old = 'https://digest-blqp.onrender.com'
$sb  = 'https://pchldmiavycxzpkzochn.supabase.co'

# 1) Login al vecchio Digest: valida la password e ottiene il token dal server
try {
  $auth = Invoke-RestMethod -Method Post -Uri "$old/api/auth" -ContentType 'application/json' `
            -Body (ConvertTo-Json @{ password = $DigestPassword })
} catch {
  Write-Error "Login al vecchio Digest FALLITO (password errata? server giu'?). Nessun dato scritto. Dettaglio: $($_.Exception.Message)"; exit 1
}
if (-not $auth.ok -or -not $auth.token) { Write-Error 'Password errata. Nessun dato scritto.'; exit 1 }
$hOld = @{ Authorization = "Bearer $($auth.token)" }
Write-Output 'Login al vecchio Digest: OK'

$hSb = @{ apikey=$ServiceKey; Authorization="Bearer $ServiceKey"; 'Content-Type'='application/json'; Prefer='resolution=merge-duplicates' }

# 2) user_id: selezionato per EMAIL (pchld ha piu' utenti: Stefano e Manu — mai prendere il "primo")
$users = Invoke-RestMethod -Headers @{ apikey=$ServiceKey; Authorization="Bearer $ServiceKey" } -Uri "$sb/auth/v1/admin/users?per_page=50"
$u = @($users.users | Where-Object { $_.email -eq $Email })
if ($u.Count -ne 1) { Write-Error "Utente '$Email' non trovato (o non univoco) su pchld. Interrompo."; exit 1 }
$uid = $u[0].id
Write-Output "user_id: $uid ($Email)"

# 3) Feed + categorie (da preferences digest_feed_cats) dal vecchio server
$feeds = @(Invoke-RestMethod -Headers $hOld -Uri "$old/api/feeds")
$prefs = Invoke-RestMethod -Headers $hOld -Uri "$old/api/preferences"
if ($feeds.Count -eq 0) { Write-Error 'Il vecchio Digest ha restituito 0 feed: qualcosa non va, interrompo senza scrivere.'; exit 1 }
Write-Output "Dal vecchio Digest: $($feeds.Count) feed"

$cats = @{}
if ($prefs.digest_feed_cats) { $prefs.digest_feed_cats.PSObject.Properties | ForEach-Object { $cats[$_.Name] = $_.Value } }

$rows = @($feeds | ForEach-Object {
  @{ id=$_.id; user_id=$uid; name=$_.name; url=$_.url; color=$_.color
     category = if ($cats.ContainsKey($_.id)) { $cats[$_.id] } else { 'news' } }
})
Invoke-RestMethod -Method Post -Headers $hSb -Uri "$sb/rest/v1/dg_feeds?on_conflict=id" -Body (ConvertTo-Json $rows -Depth 5) | Out-Null
Write-Output "dg_feeds: migrati $($rows.Count) feed"

# 4) Preferenze (feed prioritari, ultimi digest) — salta digest_feed_cats (ora colonna)
$prefRows = @()
$prefs.PSObject.Properties | Where-Object { $_.Name -ne 'digest_feed_cats' } | ForEach-Object {
  $prefRows += @{ user_id=$uid; key=$_.Name; value=$_.Value }
}
if ($prefRows.Count -gt 0) {
  Invoke-RestMethod -Method Post -Headers $hSb -Uri "$sb/rest/v1/dg_preferences?on_conflict=user_id,key" -Body (ConvertTo-Json $prefRows -Depth 10) | Out-Null
  Write-Output "dg_preferences: migrate $($prefRows.Count) chiavi"
}
Write-Output 'Fatto.'
