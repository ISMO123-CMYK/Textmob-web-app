# apk-report.ps1 <path-to.apk>
# Prints a grouped size breakdown so APK builds can be compared before/after.
# Usage:  powershell -File scripts\apk-report.ps1 "C:\path\to\app.apk"

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$ApkPath
)

if (-not (Test-Path -LiteralPath $ApkPath)) {
  Write-Error "APK not found: $ApkPath"
  exit 1
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ApkPath).Path)

$rows = foreach ($e in $zip.Entries) {
  $p = $e.FullName
  $group = if ($p -like 'lib/*')            { 'lib/' + ($p.Split('/')[1]) }
           elseif ($p -like 'classes*.dex')  { 'dex (Java/Kotlin)' }
           elseif ($p -like 'res/*.ttf')     { 'res/fonts (TTF)' }
           elseif ($p -like 'res/*')         { 'res/images+other' }
           elseif ($p -like 'assets/*')      { 'assets/' + ($p.Split('/')[1]) }
           else                              { 'other/' + ($p.Split('/')[0]) }
  [pscustomobject]@{
    Group = $group
    Compressed = $e.CompressedLength
    Raw = $e.Length
    StoredUncompressed = ($e.CompressedLength -eq $e.Length)
  }
}
$zip.Dispose()

$total = ($rows | Measure-Object Compressed -Sum).Sum
Write-Output ('APK      : {0}' -f $ApkPath)
Write-Output ('Size     : {0} MB ({1} bytes)' -f [math]::Round($total / 1MB, 1), $total)
Write-Output ''

$rows | Group-Object Group | ForEach-Object {
  $c = ($_.Group | Measure-Object Compressed -Sum).Sum
  $r = ($_.Group | Measure-Object Raw -Sum).Sum
  [pscustomobject]@{
    Group = $_.Name
    Files = $_.Count
    MB = [math]::Round($c / 1MB, 1)
    Pct = [math]::Round($c / $total * 100, 1)
    StoredMB = if ($_.Group -like 'lib/*') { [math]::Round($r / 1MB, 1) } else { $null }
  }
} | Sort-Object MB -Descending | Format-Table -AutoSize

Write-Output 'Sanity checks'
$libs = $rows | Where-Object { $_.Group -like 'lib/*' }
$abis = ($libs | ForEach-Object { $_.Group.Substring(4) } | Sort-Object -Unique) -join ', '
Write-Output ("  ABIs present     : {0}" -f $abis)
$storedLibs = ($libs | Where-Object StoredUncompressed).Count
Write-Output ("  .so uncompressed : {0}/{1}  (0 => useLegacyPackaging is working)" -f $storedLibs, $libs.Count)
$zip2 = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ApkPath).Path)
foreach ($banned in @('libbarhopper_v3.so', 'libreanimated.so', 'libworklets.so')) {
  $found = $zip2.Entries | Where-Object { $_.FullName -like "*$banned" }
  Write-Output ("  {0,-22}: {1}" -f $banned, $(if ($found) { 'PRESENT (should be absent)' } else { 'absent' }))
}
$fonts = @($zip2.Entries | Where-Object { $_.FullName -like 'res/*.ttf' }).Count
Write-Output ("  font files        : {0}  (was 43)" -f $fonts)
$zip2.Dispose()
