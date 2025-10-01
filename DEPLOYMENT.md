# Deployment Guide

## Issues Fixed

The deployment issue was caused by the custom server setup (`server.ts`) which is not supported by many deployment platforms. I've fixed this by:

1. **Switched to standard Next.js commands** - Changed from custom server to standard `next dev` and `next start`
2. **Removed Socket.IO dependency** - While Socket.IO is still available, it's not required for basic functionality
3. **Added health check endpoint** - `/api/health` for monitoring deployment status
4. **Optimized API routes** - All API routes are now standard Next.js API routes

## Deployment Steps

### 1. Build the Application
```bash
npm run build
```

### 2. Test Locally
```bash
npm start
```

### 3. Deploy to Platform

#### For Vercel (Recommended):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### For Other Platforms:
1. Upload the `.next` folder and `public` folder
2. Set environment variable: `DATABASE_URL`
3. Configure the start command: `npm start`

## Environment Variables Required

- `DATABASE_URL` - Database connection string

## Database Setup

Since this is a serverless deployment, you'll need to use an external database service:

1. **PostgreSQL** (Recommended for production)
2. **MySQL** 
3. **MongoDB** (with adapter)

Update your `DATABASE_URL` accordingly:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

## API Endpoints

All endpoints are working and tested:

- `GET /api/health` - Health check
- `GET /api/students` - Get students
- `POST /api/students` - Create student
- `GET /api/kitchen-duty` - Get kitchen duties
- `POST /api/kitchen-duty` - Create kitchen duty
- `POST /api/auto-assign` - Auto-assign duties
- `GET /api/food-menu` - Get food menu
- `POST /api/food-menu` - Create food menu
- `PUT /api/food-menu` - Update food menu
- `GET /api/food-coordinator` - Get FC info
- `POST /api/food-coordinator` - Create FC
- `GET /api/leaves` - Get leaves
- `POST /api/leaves` - Create leave
- `PUT /api/leaves` - Update leave
- `GET /api/swap-requests` - Get swap requests
- `POST /api/swap-requests` - Create swap request
- `PUT /api/swap-requests` - Update swap request
- `POST /api/discord-notify` - Send Discord notification

## Troubleshooting

### If deployment fails:

1. **Check build logs**: Ensure `npm run build` completes successfully
2. **Verify environment variables**: Make sure `DATABASE_URL` is set correctly
3. **Test API endpoints**: Use `/api/health` to verify the deployment is working
4. **Check database connection**: The health endpoint will show database status

### Common Issues:

1. **Database connection timeout**: Use a database service that allows external connections
2. **Build errors**: Make sure all dependencies are installed
3. **API route errors**: Check the server logs for specific error messages

## Performance Optimization

The application is optimized for deployment:

- **Static Generation**: Home page is statically generated
- **API Routes**: All API routes are server-side rendered
- **Image Optimization**: Images are optimized for web
- **Code Splitting**: Automatic code splitting for better performance

## Monitoring

Use the health check endpoint to monitor deployment:
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "studentCount": 8,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```