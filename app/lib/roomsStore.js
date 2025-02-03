// 简单的内存存储，在实际应用中应该使用数据库
class RoomsStore {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId, room) {
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  updateRoom(roomId, room) {
    this.rooms.set(roomId, room);
    return room;
  }

  deleteRoom(roomId) {
    return this.rooms.delete(roomId);
  }
}

// 创建单例实例
const roomsStore = new RoomsStore();

export default roomsStore; 