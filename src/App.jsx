import { useState, useEffect } from 'react'
import { database, testConnection } from './firebase'
import { ref, push, onValue, off } from 'firebase/database'
import { setupFirebaseDatabase } from './setupFirebase'
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
        setRooms(Object.keys(data))
      } else {
        setRooms([])
      }
    })

    return () => off(roomsRef, 'value', unsubscribe)
  }, [])

  // Load messages for current room
  useEffect(() => {
    if (currentRoom) {
      const messagesRef = ref(database, `rooms/${currentRoom}/messages`)
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
          const messageList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => a.timestamp - b.timestamp)
          setMessages(messageList)
        } else {
          setMessages([])
        }
      })

      return () => off(messagesRef, 'value', unsubscribe)
    }
  }, [currentRoom])

  const handleSetUsername = () => {
    if (username.trim()) {
      setIsUsernameSet(true)
    }
  }

  const createRoom = async () => {
    if (newRoomName.trim()) {
      if (firebaseStatus !== 'connected') {
        alert('Firebase connection failed. Please check your configuration.')
        return
      }
      
      try {
        const roomRef = ref(database, `rooms/${newRoomName.trim()}`)
        await push(roomRef, {
          created: Date.now(),
          createdBy: username
        })
        setNewRoomName('')
        console.log('✅ Room created successfully:', newRoomName.trim())
      } catch (error) {
        console.error('❌ Error creating room:', error)
        alert(`Failed to create room: ${error.message}`)
      }
    }
  }

  const sendMessage = async () => {
    if (message.trim() && currentRoom) {
      if (firebaseStatus !== 'connected') {
        alert('Firebase connection failed. Cannot send message.')
        return
      }
      
      try {
        const messagesRef = ref(database, `rooms/${currentRoom}/messages`)
        await push(messagesRef, {
          text: message,
          username: username,
          timestamp: Date.now()
        })
        setMessage('')
      } catch (error) {
        console.error('❌ Error sending message:', error)
        alert(`Failed to send message: ${error.message}`)
      }
    }
  }

  const joinRoom = (roomName) => {
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
          <div className="firebase-debug">
            <div>Firebase Status: {firebaseStatus}</div>
            <div>{setupMessage}</div>
            {firebaseStatus === 'failed' && (
              <div className="setup-instructions">
                <h4>🔧 Setup Required:</h4>
                <ol>
                  <li>Go to <a href="https://console.firebase.google.com/" target="_blank">Firebase Console</a></li>
                  <li>Select project: <strong>vit-chitchat-36032-2bcd8</strong></li>
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
                console.log('Room name input changed:', e.target.value)
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
