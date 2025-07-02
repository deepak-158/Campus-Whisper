import { useState } from 'react'
import './RoomCreator.css'

const RoomCreator = ({ onCreateRoom, existingRooms }) => {
  const [roomName, setRoomName] = useState('')
  const [error, setError] = useState('')

  const validateRoomName = (name) => {
    if (!name.trim()) {
      return 'Room name cannot be empty'
    }
    if (name.length < 2) {
      return 'Room name must be at least 2 characters'
    }
    if (name.length > 20) {
      return 'Room name must be less than 20 characters'
    }
    if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) {
      return 'Room name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
    if (existingRooms.includes(name.toLowerCase().trim())) {
      return 'A room with this name already exists'
    }
    return null
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const error = validateRoomName(roomName)
    
    if (error) {
      setError(error)
      return
    }

    onCreateRoom(roomName.trim())
    setRoomName('')
    setError('')
  }

  const handleInputChange = (e) => {
    setRoomName(e.target.value)
    if (error) {
      setError('')
    }
  }

  return (
    <div className="room-creator">
      <h4>Create New Room</h4>
      <form onSubmit={handleSubmit} className="create-room-form">
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter room name..."
            value={roomName}
            onChange={handleInputChange}
            className={error ? 'error' : ''}
          />
          <button type="submit" disabled={!roomName.trim()}>
            Create
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  )
}

export default RoomCreator
