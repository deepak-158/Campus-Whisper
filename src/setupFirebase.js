import { database } from './firebase'
import { ref, set, get } from 'firebase/database'

// Function to manually set up Firebase database
export const setupFirebaseDatabase = async () => {
  if (import.meta.env.DEV) {
    console.log('🔧 Setting up Firebase Database...')
  }
  
  try {
    // Test basic connection
    const testRef = ref(database, 'setup-test')
    await set(testRef, {
      timestamp: Date.now(),
      message: 'Database setup test successful'
    })
    
    if (import.meta.env.DEV) {
      console.log('✅ Basic Firebase connection works!')
    }
    
    // Create initial structure
    const initialData = {
      rooms: {
        general: {
          created: Date.now(),
          createdBy: 'System',
          messages: {
            welcome: {
              text: '👋 Welcome to Campus Whisper General Chat!',
              username: 'System Bot',
              timestamp: Date.now()
            }
          }
        },
        random: {
          created: Date.now(),
          createdBy: 'System',
          messages: {
            welcome: {
              text: '🎲 Random conversations happen here!',
              username: 'Random Bot',
              timestamp: Date.now()
            }
          }
        }
      }
    }
    
    // Check if rooms already exist
    const roomsRef = ref(database, 'rooms')
    const snapshot = await get(roomsRef)
    
    if (!snapshot.exists()) {
      if (import.meta.env.DEV) {
        console.log('📁 Creating initial room structure...')
      }
      await set(roomsRef, initialData.rooms)
      if (import.meta.env.DEV) {
        console.log('✅ Initial rooms created successfully!')
      }
    } else {
      if (import.meta.env.DEV) {
        console.log('✅ Rooms already exist, skipping creation')
      }
    }
    
    return true
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Firebase setup failed:', error.message)
      
      if (error.code === 'PERMISSION_DENIED') {
        console.error('🛡️ PERMISSION DENIED - You need to set up database rules!')
        console.error('📝 Go to Firebase Console > Realtime Database > Rules')
        console.error('🔧 Set rules to allow read/write access')
      } else if (error.message.includes('not found')) {
        console.error('🗄️ Database not found - You need to create Realtime Database!')
        console.error('📝 Go to Firebase Console > Realtime Database > Create Database')
      }
    }
    
    return false
  }
}

// Simple function to check if database exists and is accessible
export const checkDatabaseStatus = async () => {
  try {
    const testRef = ref(database, '.info/connected')
    const snapshot = await get(testRef)
    return { connected: true, exists: snapshot.exists() }
  } catch (error) {
    return { connected: false, error: error.message }
  }
}
