import 'package:smart_parking/models/user_model.dart';

class AuthService {
  //Dummy user data - will be replaced with real superbase auth later
  static const String _dummyEmail = 'adrkrandeniya@students.nsbm.ac.lk';
  static const String _dummyPassword = '12345';

  static final UserModel _dummyUser = UserModel(
    id: '1',
    studentId: '35702',
    name: 'Ravishan Kavishka',
    phone: '0782096865',
    email: 'adrkrandeniya@students.nsbm.ac.lk',
    status: 'active',
  );

  //Current logged in user
  static UserModel? currentUser;

  //Login method - returns true if login is successful, false otherwise
  static Future<bool> login(String email, String password) async {
    if (email == _dummyEmail && password == _dummyPassword) {
      currentUser = _dummyUser;
      return true;
    }
    return false;
  }

  //Logout method
  static Future<void> logout() async {
    currentUser = null;
  }
}
