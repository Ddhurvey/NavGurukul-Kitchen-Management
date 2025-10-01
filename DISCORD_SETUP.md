# 🔔 Discord Integration Setup Guide

## 📋 **Current Status**

✅ **Kitchen Team Assigned**: Today and tomorrow both have kitchen duty assignments  
✅ **Discord Message Format**: Working perfectly  
❌ **Actual Discord Sending**: Needs webhook setup  

## 🛠️ **Discord Setup Instructions**

### Step 1: Create Discord Webhook

1. **Open your Discord server**
2. **Go to Server Settings** (click the server name dropdown)
3. **Navigate to Integrations → Webhooks**
4. **Click "New Webhook"**
5. **Configure the webhook:**
   - **Name**: NavGurukul Kitchen Duty Bot
   - **Channel**: Select the channel where notifications should be sent
   - **Avatar**: (Optional) Upload NavGurukul logo

6. **Copy the Webhook URL** - It will look like:
   ```
   https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKlMnOpQrStUvWxYz
   ```

### Step 2: Set Environment Variable

Add the webhook URL to your environment:

```bash
# For development (.env file)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# For production deployment
# Set DISCORD_WEBHOOK_URL in your hosting platform's environment variables
```

### Step 3: Test the Integration

```bash
# Test Discord notification
curl -X POST http://localhost:3000/api/discord-notify \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-10-01T00:00:00.000Z"}'
```

## 📅 **Current Kitchen Assignments**

### **Today's Kitchen Team** (October 1, 2025)
- **👑 Team Lead**: Abhishek pal (Paneer 🧀)
- **👥 Team Members**:
  - Akash (Egg 🥚)
  - Deep Tiwari (Paneer 🧀)
  - Anurag Arya (Paneer 🧀)

### **Tomorrow's Kitchen Team** (October 2, 2025)
- **👑 Team Lead**: Abhishek pal (Paneer 🧀)
- **👥 Team Members**:
  - Akash (Egg 🥚)
  - Deep Tiwari (Paneer 🧀)
  - Anurag Arya (Paneer 🧀)

## 📨 **Discord Message Format**

When configured, the system will send messages like this:

```
🍳 Food menu for Tomorrow

👑 Team Lead: @Abhishek pal
👥 Team Members:
• @Akash 🥚
• @Deep Tiwari 🧀
• @Anurag Arya 🧀

🍽️ Menu:
🌅 Breakfast: Upma
🍛 Lunch: Chole+Rice
🍿 Snacks: Samosa
🌙 Dinner: Paneer+Roti

📢 @Dharamshala Student (current)
📝 Regards,
Abhishek pal (F.C)
```

## ⚙️ **Automated Notifications**

### Option 1: Manual Trigger
Use the "Send Discord Notification" button on the dashboard

### Option 2: Cron Job (Recommended)
Set up a daily cron job to automatically send notifications:

```bash
# Send notification every day at 8 PM for tomorrow's duty
0 20 * * * curl -X POST http://your-domain.com/api/discord-notify \
  -H "Content-Type: application/json" \
  -d '{"date":"'$(date -d tomorrow +%Y-%m-%d)'T00:00:00.000Z"}'
```

### Option 3: GitHub Actions (For Deployment)
Create `.github/workflows/discord-notify.yml`:

```yaml
name: Daily Discord Notification
on:
  schedule:
    - cron: '0 20 * * *'  # 8 PM daily
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Send Discord Notification
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/discord-notify \
            -H "Content-Type: application/json" \
            -d '{"date":"'$(date -d tomorrow +%Y-%m-%d)'T00:00:00.000Z"}'
```

## 🔧 **Troubleshooting**

### Issue: "Discord webhook not configured"
**Solution**: Set the `DISCORD_WEBHOOK_URL` environment variable

### Issue: Message not sending to Discord
**Solution**: 
1. Check if webhook URL is correct
2. Verify the webhook has permission to post in the channel
3. Check server logs for error messages

### Issue: Wrong kitchen team assigned
**Solution**: Use the auto-assign feature or manually assign via dashboard

## 🎯 **Next Steps**

1. ✅ **Kitchen teams are assigned** for today and tomorrow
2. ⏳ **Set up Discord webhook** (follow steps above)
3. ⏳ **Configure environment variable**
4. ⏳ **Test the integration**
5. ⏳ **Set up automated daily notifications**

---

**🎉 Your kitchen duty system is working perfectly! The only remaining step is Discord webhook configuration to enable actual message sending.**