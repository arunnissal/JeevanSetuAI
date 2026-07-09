# JeevanSetu AI - Development Configuration Guide

This document outlines how to correctly configure network communication between the frontend React Native (Expo) application and the Django backend server under various development environments.

---

## 1. Local Web Development (Expo Web)

When running the frontend in a web browser on the same PC as the Django backend:

### A. Run the Django Backend
Start the server listening on localhost:
```bash
python manage.py runserver
```

### B. Configure Frontend Environment
Ensure `frontend/.env` points to your loopback URL:
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### C. Run the Expo Metro Server
```bash
npx expo start --clear
```

---

## 2. Mobile Device Testing (Expo Go on Real Device)

When running the application on a physical Android phone or iPhone connected to the same local network (Wi-Fi):

### A. Determine your PC's active LAN IP
Run the Windows networking command to locate your Wi-Fi or Ethernet adapter's IPv4 address:
```powershell
ipconfig
```
Example Output:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 10.110.52.222
```
> [!WARNING]
> Your local LAN IP is assigned dynamically by DHCP. It can change whenever your computer reconnects to the Wi-Fi network, gets a new router lease, or restarts.

### B. Configure Frontend Environment
Replace `localhost` with your active PC LAN IP inside `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=http://<YOUR_CURRENT_LAN_IP>:8000/api/v1
```
For example:
```env
EXPO_PUBLIC_API_URL=http://10.110.52.222:8000/api/v1
```

### C. Run the Django Backend
Bind the development server to all network interfaces so it can accept external network connections:
```bash
python manage.py runserver 0.0.0.0:8000
```

### D. Clear Metro Cache and Start Expo
```bash
npx expo start --clear
```
Scan the Metro QR code with the Expo Go app. Ensure both the PC and the mobile device are connected to the exact same Wi-Fi subnet/router.

---

## 3. Network Debugging & Diagnostics

Verbose Axios request/response diagnostics are pre-configured to log in console outputs during development mode. 

### Connection Timeout
If you receive:
> *Connection error. Please check if the backend server is running and accessible.*

1. Re-run `ipconfig` to verify if your PC's IP address has changed.
2. Confirm the Django console shows `Starting development server at http://0.0.0.0:8000/`.
3. Check that your Windows Firewall allows inbound connections on port `8000`.
