class UserModel {
  final String id;
  final String studentId;
  final String name;
  final String phone;
  final String email;
  final String status;

  UserModel({
    required this.id,
    required this.studentId,
    required this.name,
    required this.phone,
    required this.email,
    required this.status,
  });

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['id'],
      studentId: map['student_id'],
      name: map['name'],
      phone: map['phone'],
      email: map['email'],
      status: map['status'],
    );
  }
}
