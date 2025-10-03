# Discord Configuration Guide

## 🔧 Setup Instructions

To enable Discord message sending, you need to configure either a Discord Webhook or a Discord Bot.

### Option 1: Discord Webhook (Recommended - Easier)

1. **Create a Discord Webhook:**
   - Go to your Discord server settings
   - Navigate to "Integrations" → "Webhooks"
   - Click "Create Webhook"
   - Choose the channel where messages should be sent
   - Copy the Webhook URL

2. **Configure Environment Variables:**
   Add to your `.env.local` file:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
   ```

### Option 2: Discord Bot (More Features)

1. **Create a Discord Application:**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Give it a name (e.g., "Kitchen Bot")
   - Go to "Bot" section and click "Add Bot"

2. **Get Bot Token:**
   - Copy the bot token
   - Enable "Message Content Intent" in bot settings

3. **Invite Bot to Server:**
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`
   - Select permissions: `Send Messages`, `Mention Everyone`, `Mention Users`
   - Copy the generated URL and paste in browser to invite to your server

4. **Get Channel ID:**
   - In Discord, go to the channel where you want messages
   - Right-click on the channel name and "Copy Channel ID"
   - (Enable Developer Mode in Discord settings if you don't see this option)

5. **Configure Environment Variables:**
   Add to your `.env.local` file:
   ```
   DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN
   DISCORD_CHANNEL_ID=YOUR_CHANNEL_ID
   ```

### Option 3: User ID Mapping (For Proper Mentions)

To make `@mentions` work properly, you need to map student names to Discord User IDs.

1. **Get Discord User IDs:**
   - In Discord, go to User Settings → Advanced → Enable Developer Mode
   - Right-click on a user and "Copy User ID"

2. **Update the mapping in `/src/lib/discord.ts`:**
   ```typescript
   const DISCORD_USER_MAPPING: { [key: string]: string } = {
     'Govind': '123456789012345678', // Replace with actual Discord user ID
     'Md Arhan Alam': '234567890123456789', // Replace with actual Discord user ID
     'Diana Prince': '345678901234567890', // Replace with actual Discord user ID
     'DevendraDhurvey(꧁रA1꧂)': '456789012345678901', // Replace with actual Discord user ID
     // Add more mappings as needed
   }
   ```

## 🧪 Testing

1. **Test Discord Connection:**
   ```bash
   curl "http://localhost:3000/api/discord-message?test=true"
   ```

2. **Test Message Generation:**
   - Go to the Discord Message section in the app
   - Click "Generate Discord Message"
   - Click "Send to Discord" (if configured)

## 📝 Example .env.local

```env
# Discord Configuration (choose ONE option)

# Option 1: Webhook (Recommended)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789012345678/abcdef123456789

# Option 2: Bot Token
# DISCORD_BOT_TOKEN=abcdefghijklmnopqrstuvwxyz123456
# DISCORD_CHANNEL_ID=123456789012345678

# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## 🔍 Troubleshooting

### Common Issues:

1. **"Discord not configured" error:**
   - Make sure environment variables are set correctly
   - Restart the development server after changing .env.local

2. **"Failed to send to Discord" error:**
   - Check if webhook URL is valid and not expired
   - Verify bot has proper permissions
   - Make sure channel ID is correct

3. **Mentions not working:**
   - Update the DISCORD_USER_MAPPING with correct Discord User IDs
   - Enable Developer Mode in Discord to copy User IDs

4. **Bot not sending messages:**
   - Check if bot is online and has proper permissions
   - Verify the channel ID is correct
   - Make sure bot token is valid

### Debug Mode:

Add this to your code to see detailed error messages:
```typescript
console.log('Discord Config:', {
  hasWebhook: !!process.env.DISCORD_WEBHOOK_URL,
  hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
  hasChannelId: !!process.env.DISCORD_CHANNEL_ID
})
```

## 🚀 Production Deployment

For production deployment:

1. Use environment variables in your hosting platform
2. Never commit Discord tokens to git repository
3. Use secure storage for webhook URLs and bot tokens
4. Test Discord integration in production environment

## 📱 Features Available

- ✅ Generate formatted Discord messages
- ✅ Send messages via Webhook or Bot
- ✅ Proper @mentions for team members
- ✅ Team Leader (T.L) and IT indicators
- ✅ Location and meal information
- ✅ Error handling and status feedback
- ✅ Custom message templates
- ✅ Date-specific messages