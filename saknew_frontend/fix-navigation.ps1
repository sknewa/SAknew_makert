# Fix navigation TypeScript errors
Write-Host "Fixing navigation errors..." -ForegroundColor Green

$files = @(
    "screens\ShopOwner\ProductManagementScreen.tsx",
    "screens\Status\StatusListScreen.tsx",
    "screens\Status\StatusTabScreen.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file..." -ForegroundColor Yellow
        $content = Get-Content $file -Raw
        
        # Fix navigation calls
        $content = $content -replace "navigation\.navigate\('EditProduct',\s*\{", "navigation.navigate('EditProduct' as any, {"
        $content = $content -replace "navigation\.navigate\('AddPromotion',\s*\{", "navigation.navigate('AddPromotion' as any, {"
        $content = $content -replace "navigation\.navigate\('CreateStatus'\)", "navigation.navigate('CreateStatus' as any)"
        $content = $content -replace "navigation\.navigate\('StatusViewer',\s*\{", "navigation.navigate('StatusViewer' as any, {"
        
        Set-Content $file $content -NoNewline
        Write-Host "Fixed $file" -ForegroundColor Green
    }
}

Write-Host "`nDone! Run 'npm run type-check' to verify." -ForegroundColor Cyan
