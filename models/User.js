// Simple in-memory user storage (replace with database in production)
let users = [];

class User {
  constructor(name, mobile) {
    this.id = Date.now().toString();
    this.name = name;
    this.mobile = mobile;
    this.createdAt = new Date().toISOString();
  }

  static create(name, mobile) {
    // Check if user already exists
    const existingUser = users.find((u) => u.mobile === mobile);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = new User(name, mobile);
    users.push(user);
    return user;
  }

  static findByMobile(mobile) {
    return users.find((u) => u.mobile === mobile);
  }

  static findById(id) {
    return users.find((u) => u.id === id);
  }

  // Return user data
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      mobile: this.mobile,
      createdAt: this.createdAt,
    };
  }
}

export default User;

