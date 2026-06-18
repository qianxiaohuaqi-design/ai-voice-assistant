# OhMyGPT Gemini CLI Setup Helper

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "        OhMyGPT Gemini CLI Setup Helper" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Prompt user for their OhMyGPT API Key
$apiKey = Read-Host "Please paste your OhMyGPT API Key (starting with sk-)"
$apiKey = $apiKey.Trim()

if (-not $apiKey.StartsWith("sk-")) {
    Write-Host "Error: The key must start with 'sk-'. Please run the script again and paste the correct key." -ForegroundColor Red
    Exit
}

# 2. Set the environment variables permanently for the user
Write-Host ""
Write-Host "Setting environment variables..." -ForegroundColor Yellow
[System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY", $apiKey, "User")
[System.Environment]::SetEnvironmentVariable("GOOGLE_GEMINI_BASE_URL", "https://apic1.ohmycdn.com", "User")
Write-Host "✓ Environment variables configured successfully!" -ForegroundColor Green

# 3. Clean up any cached credentials in Windows Credential Manager
Write-Host ""
Write-Host "Clearing cached credentials..." -ForegroundColor Yellow
cmdkey /delete:gemini-cli-api-key/default-api-key 2>$null
Write-Host "✓ Cached credentials cleared!" -ForegroundColor Green

# 4. Success message
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "                    SUCCESS!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Please follow these steps to complete the setup:"
Write-Host "1. CLOSE this PowerShell window completely."
Write-Host "2. Open a NEW PowerShell window."
Write-Host "3. Run the following commands to start Gemini CLI:"
Write-Host "   d:"
Write-Host "   cd D:\claude"
Write-Host "   gemini"
Write-Host "==================================================" -ForegroundColor Green
Read-Host "Press Enter to exit..."
