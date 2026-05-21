@echo off
cd /d "%~dp0"
echo Starting Bill Splitter Mobile...
echo.
echo After Metro starts, open Expo Go on your iPhone
echo and tap "Scan QR Code" to connect.
echo.
echo If no QR code appears, try:
echo    Press "s" to switch to Expo Go mode
echo    Press "d" to open Dev Tools in browser
echo.
echo Your IP: 192.168.1.84
echo Manual URL: exp://192.168.1.84:8081
echo.
npx expo start --clear
pause
