import { useState, useEffect } from 'react'
import { database, testConnection } from './firebase'
import { ref, push, onValue, off, get, set } from 'firebase/database'
import { setupFirebaseDatabase } from './setupFirebase'
import { securityManager, DataProtection } from './security'
import { ipSecurityManager, NetworkSecurity } from './ipSecurity'
import './App.css'

function App() {
  const [username, setUsername] = useState('')
  const [currentRoom, setCurrentRoom] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [rooms, setRooms] = useState([])
  const [newRoomName, setNewRoomName] = useState('')
  const [isUsernameSet, setIsUsernameSet] = useState(false)
  const [firebaseStatus, setFirebaseStatus] = useState('connecting')
  const [setupMessage, setSetupMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)

  // Test Firebase connection on component mount
  useEffect(() => {
    const checkFirebase = async () => {
      try {
        setSetupMessage('Testing Firebase connection...')
        const isConnected = await testConnection()
        
        if (isConnected) {
          setSetupMessage('Setting up database...')
          const setupSuccess = await setupFirebaseDatabase()
          
          if (setupSuccess) {
            setFirebaseStatus('connected')
            setSetupMessage('Firebase ready!')
          } else {
            setFirebaseStatus('failed')
            setSetupMessage('Database setup failed - check console')
          }
        } else {
          setFirebaseStatus('failed')
          setSetupMessage('Connection failed - check configuration')
        }
      } catch (error) {
        console.error('Firebase setup error:', error)
        setFirebaseStatus('failed')
        setSetupMessage(`Error: ${error.message}`)
      }
    }
    
    checkFirebase()
  }, [])

  // Generate random username suggestion
  const generateRandomUsername = () => {
    const adjectives = ['Cool', 'Smart', 'Fast', 'Bright', 'Happy', 'Swift', 'Bold', 'Calm', 'Epic', 'Zen']
    const nouns = ['Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk', 'Shark', 'Phoenix', 'Dragon']
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNumber = Math.floor(Math.random() * 999) + 1
    return `${randomAdjective}${randomNoun}${randomNumber}`
  }

  // Load rooms from Firebase
  useEffect(() => {
    const roomsRef = ref(database, 'rooms')
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const roomList = Object.keys(data)
        securityManager.safeLog('🏠 Rooms updated:', roomList.length, 'rooms')
        securityManager.safeLog('🔍 Current room before update:', currentRoom)
        setRooms(roomList)
        // Don't change currentRoom here - let user control room selection
      } else {
        securityManager.safeLog('🏠 No rooms found, clearing list')
        setRooms([])
        // Only clear currentRoom if the current room no longer exists
        if (currentRoom) {
          securityManager.safeLog('⚠️ Current room cleared because no rooms exist')
          setCurrentRoom('')
        }
      }
    })

    return () => off(roomsRef, 'value', unsubscribe)
  }, []) // Remove currentRoom from dependency array

  // Load messages for current room
  useEffect(() => {
    if (currentRoom) {
      securityManager.safeLog('💬 Setting up message listener for room')
      const messagesRef = ref(database, `rooms/${currentRoom}/messages`)
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const messageList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => a.timestamp - b.timestamp)
          securityManager.safeLog('📨 Messages updated:', messageList.length, 'messages')
          setMessages(messageList)
        } else {
          securityManager.safeLog('📭 No messages found for current room')
          setMessages([])
        }
      })

      return () => {
        securityManager.safeLog('🔇 Cleaning up message listener')
        off(messagesRef, 'value', unsubscribe)
      }
    } else {
      securityManager.safeLog('🚫 No current room, clearing messages')
      setMessages([])
    }
  }, [currentRoom])

  const handleSetUsername = () => {
    if (username.trim()) {
      setIsUsernameSet(true)
    }
  }

  const createRoom = async () => {
    if (newRoomName.trim()) {
      // Client-side rate limiting
      if (!ipSecurityManager.isActionAllowed('rooms')) {
        alert('Rate limit exceeded. Please wait before creating another room.');
        return;
      }
      
      if (firebaseStatus !== 'connected') {
        alert('Firebase connection failed. Please check your configuration.')
        return
      }
      
      try {
        // Firebase-based rate limiting check
        const firebaseAllowed = await ipSecurityManager.checkFirebaseRateLimit(database, 'room');
        if (!firebaseAllowed) {
          alert('Server rate limit exceeded. Please try again later.');
          return;
        }
        
        // Check if room already exists
        const roomsRef = ref(database, 'rooms');
        const snapshot = await get(roomsRef);
        const rooms = snapshot.val() || {};
        
        if (Object.keys(rooms).includes(newRoomName.trim())) {
          alert('A room with this name already exists. Please choose a different name.');
          return;
        }
        
        const roomRef = ref(database, `rooms/${newRoomName.trim()}`)
        const sanitizedData = NetworkSecurity.sanitizeRequestData({
          created: Date.now(),
          createdBy: username
        });
        
        await set(roomRef, sanitizedData)
        setNewRoomName('')
        securityManager.safeLog('✅ Room created successfully')
      } catch (error) {
        securityManager.safeError('❌ Error creating room:', error.message)
        alert(`Failed to create room: ${error.message}`)
      }
    }
  }

  const sendMessage = async () => {
    if (message.trim() && currentRoom) {
      // Client-side rate limiting check
      if (!ipSecurityManager.isActionAllowed('messages')) {
        alert('Rate limit exceeded. Please slow down your messaging.');
        return;
      }
      
      if (firebaseStatus !== 'connected') {
        alert('Firebase connection failed. Cannot send message.')
        return
      }
      
      try {
        // Firebase-based rate limiting check
        const firebaseAllowed = await ipSecurityManager.checkFirebaseRateLimit(database, 'message');
        if (!firebaseAllowed) {
          alert('Server rate limit exceeded. Please try again later.');
          return;
        }
        
        const messagesRef = ref(database, `rooms/${currentRoom}/messages`)
        const sanitizedData = NetworkSecurity.sanitizeRequestData({
          text: message.trim(),
          username: username,
          timestamp: Date.now()
        });
        
        await push(messagesRef, sanitizedData)
        setMessage('')
      } catch (error) {
        securityManager.safeError('❌ Error sending message:', error.message)
        alert(`Failed to send message: ${error.message}`)
      }
    }
  }

  const joinRoom = (roomName) => {
    securityManager.safeLog('🚪 Room selection changed')
    setCurrentRoom(roomName)
    setMessages([])
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  // Close sidebar when selecting a room on mobile
  const handleRoomSelect = (room) => {
    joinRoom(room)
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isUsernameSet) {
    return (
      <div className="app">
        <div className="username-setup">
          <h1>🎭 Campus Whisper</h1>
          <p>Anonymous Chat Rooms</p>
          
          <div className="floating-app-suggestion">
            <div className="cloud-box">
              <span className="cloud-emoji">🌙</span>
              <div className="suggestion-content">
                <span className="suggestion-text">Night cravings?</span>
                <a href="https://vit-campus-connect.vercel.app/" target="_blank" rel="noopener noreferrer" className="suggestion-link">
                  Buy from blockmates
                </a>
              </div>
            </div>
          </div>
          
          <div className="firebase-debug">
            <div>Firebase Status: {firebaseStatus}</div>
            <div>{setupMessage}</div>
            {firebaseStatus === 'failed' && (
              <div className="setup-instructions">
                <h4>🔧 Setup Required:</h4>
                <ol>
                  <li>Go to <a href="https://console.firebase.google.com/" target="_blank">Firebase Console</a></li>
                  <li>Select project: <strong>vit-chitchat-36032-5dca4</strong></li>
                  <li>Create <strong>Realtime Database</strong> (not Firestore)</li>
                  <li>Start in <strong>test mode</strong></li>
                  <li>Set rules to allow read/write</li>
                </ol>
              </div>
            )}
          </div>
          <div className="username-form">
            <input
              type="text"
              placeholder="Enter your anonymous username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSetUsername()}
            />
            <button onClick={() => setUsername(generateRandomUsername())}>
              Generate Random
            </button>
            <button onClick={handleSetUsername} disabled={!username.trim()}>
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
      
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="user-info">
          <h3>👤 {username}</h3>
          <button onClick={() => setIsUsernameSet(false)} className="change-username">
            Change Username
          </button>
          <div className={`firebase-status ${firebaseStatus}`}>
            {firebaseStatus === 'connecting' && '🔄 Connecting to Firebase...'}
            {firebaseStatus === 'connected' && '✅ Firebase Connected'}
            {firebaseStatus === 'failed' && '❌ Firebase Connection Failed'}
          </div>
        </div>
        
        <div className="room-creation">
          <h4>Create New Room</h4>
          <div className="create-room-form">
            <input
              type="text"
              placeholder="Enter room name..."
              value={newRoomName}
              onChange={(e) => {
                setNewRoomName(e.target.value)
              }}
              onKeyPress={(e) => e.key === 'Enter' && createRoom()}
            />
            <button onClick={createRoom} disabled={!newRoomName.trim()}>
              Create Room
            </button>
          </div>
        </div>

        <div className="rooms-list">
          <h4>Available Rooms</h4>
          {rooms.length === 0 ? (
            <p className="no-rooms">No rooms available. Create one!</p>
          ) : (
            rooms.map(room => (
              <div
                key={room}
                className={`room-item ${currentRoom === room ? 'active' : ''}`}
                onClick={() => handleRoomSelect(room)}
              >
                #{room}
              </div>
            ))
          )}
        </div>

        <div className="sidebar-app-promotion">
          <div className="mini-app-card">
            <h4>� VIT Campus Connect</h4>
            <p>Late night cravings? Buy from your blockmates!</p>
            <a href="https://vit-campus-connect.vercel.app/" target="_blank" rel="noopener noreferrer" className="mini-app-link">
              Order Now →
            </a>
          </div>
        </div>
      </div>

      <div className="chat-area">
        {currentRoom ? (
          <>
            <div className="chat-header">
              <button className="hamburger-menu" onClick={toggleSidebar}>
                <span></span>
                <span></span>
                <span></span>
              </button>
              <div className="room-info">
                <h2>#{currentRoom}</h2>
                <span className="room-status">
                  {messages.length} messages
                </span>
              </div>
              <button className="toggle-sidebar" onClick={toggleSidebar}>
                {sidebarOpen ? '◀' : '▶'}
              </button>
            </div>
            
            <div className="messages-container">
              {messages.length === 0 ? (
                <p className="no-messages">No messages yet. Start the conversation!</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.username === username ? 'own-message' : ''}`}>
                    <div className="message-header">
                      <span className="username">{msg.username}</span>
                      <span className="timestamp">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="message-text">{msg.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="message-input">
              <input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => {
                  console.log('Message input changed:', e.target.value)
                  setMessage(e.target.value)
                }}
                onKeyPress={handleKeyPress}
              />
              <button onClick={sendMessage} disabled={!message.trim()}>
              </button>
            </div>
          </>
        ) : (
          <div className="no-room-selected">
            <button className="hamburger-menu" onClick={toggleSidebar}>
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className="welcome-content">
              <h2>Welcome to Campus Whisper! 🎭</h2>
              <p>Select a room from the sidebar to start chatting, or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
