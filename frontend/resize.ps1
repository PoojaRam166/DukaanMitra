Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("public/pwa-192x192-v2.png")
$bmp1 = New-Object System.Drawing.Bitmap(192, 192)
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.DrawImage($img, 0, 0, 192, 192)
$bmp1.Save("public/pwa-192x192-v3.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp2 = New-Object System.Drawing.Bitmap(512, 512)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.DrawImage($img, 0, 0, 512, 512)
$bmp2.Save("public/pwa-512x512-v3.png", [System.Drawing.Imaging.ImageFormat]::Png)

$img.Dispose()
$bmp1.Dispose()
$g1.Dispose()
$bmp2.Dispose()
$g2.Dispose()
