$k=$PSScriptRoot; $c="C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $c)) { $c="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }
function Render-Svg($svg,$png,$w,$h){ & $c --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 --window-size="$w,$h" --screenshot="$k\png\$png" "file:///$k/svg/$svg" 2>$null | Out-Null }
Render-Svg "portalcast-icon.svg" "portalcast-icon-1024.png" 1024 1024
Render-Svg "portalcast-icon-maskable.svg" "portalcast-icon-maskable-1024.png" 1024 1024
Render-Svg "portalcast-symbol.svg" "portalcast-symbol-1024.png" 860 1024
Render-Svg "portalcast-logo.svg" "portalcast-logo-1592.png" 1592 384
Render-Svg "portalcast-logo-on-light.svg" "portalcast-logo-on-light-1592.png" 1592 384
Render-Svg "portalcast-tv-banner.svg" "portalcast-tv-banner-1280.png" 1280 720
Add-Type -AssemblyName System.Drawing
function Scale-Png($src,$dst,$w,$h){ $i=[System.Drawing.Image]::FromFile("$k\png\$src"); $b=New-Object System.Drawing.Bitmap $w,$h; $g=[System.Drawing.Graphics]::FromImage($b); $g.InterpolationMode='HighQualityBicubic'; $g.SmoothingMode='HighQuality'; $g.PixelOffsetMode='HighQuality'; $g.CompositingQuality='HighQuality'; $g.DrawImage($i,0,0,$w,$h); $b.Save("$k\png\$dst",[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $b.Dispose(); $i.Dispose() }
foreach($n in 512,192,180,144,96,72,64,48,32,16){ Scale-Png "portalcast-icon-1024.png" "portalcast-icon-$n.png" $n $n }
Scale-Png "portalcast-icon-maskable-1024.png" "portalcast-icon-maskable-512.png" 512 512
Scale-Png "portalcast-tv-banner-1280.png" "portalcast-tv-banner-640.png" 640 360
# favicon.ico with embedded 16/32/48 PNGs
$sizes=16,32,48; $datas=$sizes | ForEach-Object { ,[System.IO.File]::ReadAllBytes("$k\png\portalcast-icon-$_.png") }
$ms=New-Object System.IO.MemoryStream; $bw=New-Object System.IO.BinaryWriter $ms
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
$off=6+16*$sizes.Count
for($j=0;$j -lt $sizes.Count;$j++){ $bw.Write([byte]$sizes[$j]); $bw.Write([byte]$sizes[$j]); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$datas[$j].Length); $bw.Write([UInt32]$off); $off+=$datas[$j].Length }
foreach($d in $datas){ $bw.Write($d) }
[System.IO.File]::WriteAllBytes("$k\png\favicon.ico",$ms.ToArray())
Get-ChildItem "$k\png" | Select-Object Name,Length | Format-Table -AutoSize
