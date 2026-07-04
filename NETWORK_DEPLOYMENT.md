# Network Deployment Guide for Medical Certificate System

## Backend Configuration

The backend is now configured to listen on all network interfaces (0.0.0.0) on port 5000.

### To use on your network:

1. Find your server's IP address:
   ```bash
   hostname -I
   ```

2. The backend will be accessible at:
   ```
   http://<YOUR_SERVER_IP>:5000
   ```

   Example: `http://192.168.54.129:5000`

## Frontend Configuration

The frontend is configured to use environment variables for API URLs.

### To connect to a network backend:

1. Edit `frontend/.env`:
   ```
   VITE_API_URL=http://<YOUR_SERVER_IP>:5000
   ```

   Replace `<YOUR_SERVER_IP>` with your backend server's IP address.
   
   Example: `VITE_API_URL=http://192.168.54.129:5000`

2. Rebuild the frontend:
   ```bash
   cd frontend
   npm run build
   ```

3. Deploy the `frontend/dist` folder to your web server.

## SMS Gateway Configuration

### Beem Africa SMS Service

The backend is already configured with Beem Africa SMS gateway:

- **Enabled**: Yes (`BEEM_ENABLED=true` in `.env`)
- **API Key**: Configured in `backend/.env`
- **Base URL**: `https://api.beem.africa/v1`
- **Sender ID**: `AFISA AFYA`

#### SMS Template

Expiry reminder SMS sent to employees in Swahili:
```
AFISA AFYA

Ndugu [EMPLOYEE_NAME],

Tunakukumbusha kuwa kibali chako cha biashara kitaisha tarehe [EXPIRY_DATE]. 
Tafadhali hakikisha unakihuisha kabla au ifikapo tarehe hiyo ili kuendelea kufanya 
biashara bila usumbufu.

Asante,
AFISA AFYA
```

#### Test SMS Endpoint

To send a test SMS:
```bash
curl -X POST http://YOUR_SERVER_IP:5000/api/employees/test-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0741742627",
    "message": "Your test SMS message"
  }'
```

## Component API Usage

All React components have been updated to use centralized API configuration located at:
- `frontend/src/config/apiConfig.js`

This ensures all API calls use the configured base URL, making it easy to switch between localhost development and production network deployment.

### Files Updated:
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx`
- `frontend/src/pages/AdminDashboard.jsx`
- `frontend/src/components/employees/EmployeeList.jsx`
- (Additional components to be updated similarly)

## Firewall Configuration

Ensure your firewall allows:
- **Inbound**: Port 5000 (backend API)
- **Outbound**: HTTPS to `api.beem.africa` (for SMS sending)

## Development vs Production

### Development (localhost):
```
Frontend: http://localhost:3000 (or Vite dev server)
Backend: http://localhost:5000
API URL: http://localhost:5000
```

### Production (network):
```
Frontend: http://<YOUR_DOMAIN or IP>
Backend: http://<YOUR_SERVER_IP>:5000
API URL: http://<YOUR_SERVER_IP>:5000
```
