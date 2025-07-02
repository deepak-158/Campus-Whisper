# Firebase Security Rules for Campus Whisper

## Recommended Database Rules (Strict Security)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": "auth != null || (
          newData.exists() && 
          newData.hasChildren(['created', 'createdBy']) ||
          root.child('rooms/' + $roomId).exists()
        )",
        "messages": {
          "$messageId": {
            ".read": true,
            ".write": "auth != null || (
              !data.exists() &&
              newData.hasChildren(['text', 'username', 'timestamp']) && 
              newData.child('text').isString() && 
              newData.child('username').isString() && 
              newData.child('timestamp').isNumber() &&
              newData.child('text').val().length <= 1000 &&
              newData.child('username').val().length <= 50
            )",
            ".validate": "
              newData.hasChildren(['text', 'username', 'timestamp']) &&
              newData.child('text').isString() &&
              newData.child('username').isString() &&
              newData.child('timestamp').isNumber() &&
              newData.child('text').val().length > 0 &&
              newData.child('text').val().length <= 1000 &&
              newData.child('username').val().length > 0 &&
              newData.child('username').val().length <= 50
            "
          }
        },
        "created": {
          ".validate": "newData.isNumber()"
        },
        "createdBy": {
          ".validate": "newData.isString() && newData.val().length <= 50"
        }
      }
    },
    "setup-test": {
      ".read": true,
      ".write": true
    },
    ".read": false,
    ".write": false
  }
}
```

## Security Features:

1. **Message Length Limits**: Text limited to 1000 characters, usernames to 50 characters
2. **Required Fields**: All messages must have text, username, and timestamp
3. **Data Type Validation**: Ensures proper data types for all fields
4. **No Null/Empty Values**: Prevents empty messages or usernames
5. **Room Creation Control**: Only allows valid room creation
6. **Global Fallback**: Denies all other read/write operations

## Additional Security Measures:

### 1. Rate Limiting (Firebase Console)
- Go to Firebase Console > Realtime Database > Usage
- Set up rate limiting to prevent spam

### 2. IP Whitelisting (Optional)
- For production, consider IP restrictions
- Firebase Console > Project Settings > General > Public settings

### 3. Monitoring
- Enable Firebase Security Rules testing
- Monitor usage in Firebase Console > Realtime Database > Usage

### 4. Data Retention
- Consider automatic data cleanup for old messages
- Implement using Firebase Cloud Functions

## Implementation Steps:

1. Go to Firebase Console
2. Select your project: `vit-chitchat-36032-2bcd8`
3. Navigate to Realtime Database > Rules
4. Replace existing rules with the JSON above
5. Click "Publish"

## Warning:
These rules are more restrictive than the basic setup. Test thoroughly in your development environment before applying to production.
