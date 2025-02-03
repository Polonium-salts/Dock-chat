// 简单的内存存储，在实际应用中应该使用数据库
const rooms = new Map();

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function setRoom(roomId, room) {
  rooms.set(roomId, room);
}

export function getAllRooms() {
  return Array.from(rooms.values());
}

export function addMemberToRoom(roomId, user) {
  const room = rooms.get(roomId);
  if (room && !room.members.find(member => member.email === user.email)) {
    room.members.push(user);
    rooms.set(roomId, room);
    return true;
  }
  return false;
} 