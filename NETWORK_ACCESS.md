# Network Access Setup for HR Management System

## Your Computer's Network Information
- **IP Address:** 192.168.254.196
- **Port:** 3001

## How to Share with Other PCs

### Step 1: Restart the Development Server
1. Stop the current server (press `Ctrl + C` in the terminal)
2. Start it again with: `npm run dev`

### Step 2: Share the Link
Send this link to other computers on your network:

```
http://192.168.254.196:3001
```

### Step 3: Access from Other PCs
On any other computer connected to the **same WiFi/network**, open a web browser and go to:

**http://192.168.254.196:3001**

---

## Login Credentials
- **Username:** admin
- **Password:** admin123

---

## Important Notes

### ✅ Requirements for Other PCs:
1. Must be on the **same network** (same WiFi or LAN)
2. Your computer (192.168.254.196) must be **running** with the dev server active
3. Windows Firewall may need to allow the connection (see below)

### 🔥 Windows Firewall Setup (If Connection Fails)

If other PCs can't connect, you may need to allow Node.js through Windows Firewall:

1. Open **Windows Defender Firewall**
2. Click **"Allow an app or feature through Windows Defender Firewall"**
3. Click **"Change settings"**
4. Find **"Node.js"** in the list and check both **Private** and **Public**
5. If Node.js is not in the list:
   - Click **"Allow another app..."**
   - Browse to: `C:\Program Files\nodejs\node.exe`
   - Add it and check both boxes

### 📱 Access from Mobile Devices
You can also access the system from phones/tablets on the same WiFi:

**http://192.168.254.196:3001**

---

## Troubleshooting

### Problem: "This site can't be reached"
**Solutions:**
1. Make sure your computer is running the dev server (`npm run dev`)
2. Check that both computers are on the same network
3. Try disabling Windows Firewall temporarily to test
4. Verify your IP address hasn't changed: `ipconfig`

### Problem: IP Address Changed
If your computer's IP changes (after restart), run:
```
ipconfig | findstr /i "IPv4"
```
Then update the link with the new IP address.

---

## For Production Deployment

For a permanent setup accessible 24/7, consider:
1. **Build for production:** `npm run build`
2. **Deploy to a server** (Vercel, DigitalOcean, etc.)
3. **Use a proper domain name**

This current setup is for **development/testing** on your local network only.
