import 'package:flutter/material.dart';
import 'package:smart_parking/services/auth_service.dart';

class CarParkScreen extends StatefulWidget {
  const CarParkScreen({super.key});

  @override
  State<CarParkScreen> createState() => _CarParkScreenState();
}

class _CarParkScreenState extends State<CarParkScreen> {
  // Dummy slots - will be replaced with real Supabase data later
  final List<Map<String, dynamic>> _availableSlots = [
    {"id": "1", "code": "C1", "type": "car"},
    {"id": "2", "code": "C2", "type": "car"},
    {"id": "3", "code": "C3", "type": "car"},
    {"id": "4", "code": "C4", "type": "car"},
    {"id": "5", "code": "C5", "type": "car"},
    {"id": "6", "code": "C6", "type": "car"},
    {"id": "7", "code": "C7", "type": "car"},
    {"id": "8", "code": "C8", "type": "car"},
    {"id": "9", "code": "C9", "type": "car"},
    {"id": "10", "code": "C10", "type": "car"},
    {"id": "11", "code": "C11", "type": "car"},
    {"id": "12", "code": "C12", "type": "car"},
    {"id": "13", "code": "C13", "type": "car"},
    {"id": "14", "code": "C14", "type": "car"},
    {"id": "15", "code": "C15", "type": "car"},
    {"id": "16", "code": "C16", "type": "car"},
    {"id": "17", "code": "C17", "type": "car"},
    {"id": "18", "code": "C18", "type": "car"},
    {"id": "19", "code": "C19", "type": "car"},
    {"id": "20", "code": "C20", "type": "car"},
    {"id": "21", "code": "M1", "type": "motorbike"},
    {"id": "22", "code": "M2", "type": "motorbike"},
    {"id": "23", "code": "M3", "type": "motorbike"},
    {"id": "24", "code": "M4", "type": "motorbike"},
    {"id": "25", "code": "M5", "type": "motorbike"},
    {"id": "26", "code": "M6", "type": "motorbike"},
    {"id": "27", "code": "M7", "type": "motorbike"},
    {"id": "28", "code": "M8", "type": "motorbike"},
    {"id": "29", "code": "M9", "type": "motorbike"},
    {"id": "30", "code": "M10", "type": "motorbike"},
    {"id": "31", "code": "M11", "type": "motorbike"},
    {"id": "32", "code": "M12", "type": "motorbike"},
    {"id": "33", "code": "M13", "type": "motorbike"},
    {"id": "34", "code": "M14", "type": "motorbike"},
    {"id": "35", "code": "M15", "type": "motorbike"},
    {"id": "36", "code": "M16", "type": "motorbike"},
    {"id": "37", "code": "M17", "type": "motorbike"},
    {"id": "38", "code": "M18", "type": "motorbike"},
    {"id": "39", "code": "M19", "type": "motorbike"},
    {"id": "40", "code": "M20", "type": "motorbike"},
  ];

  // Dummy vehicles - will be replaced with real Supabase data later
  final List<Map<String, dynamic>> _userVehicles = [
    {"id": "1", "plate_number": "WP-1234", "type": "car"},
    {"id": "2", "plate_number": "WP-5678", "type": "motorbike"},
  ];

  String? _selectedSlotId;
  String? _selectedSlotCode;
  String? _selectedSlotType;
  String? _selectedVehicleId;
  String? _selectedVehiclePlate;
  DateTime? _selectedTime;
  bool _isLoading = false;

  List<Map<String, dynamic>> get _filteredSlots {
    if (_selectedVehicleId == null) return _availableSlots;
    final vehicleType =
        _userVehicles.firstWhere((v) => v["id"] == _selectedVehicleId)["type"]
            as String;
    return _availableSlots.where((s) => s["type"] == vehicleType).toList();
  }

  Future<void> _pickTime() async {
    final now = DateTime.now();
    final picked = await showDateTimePicker(context, now);
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<DateTime?> showDateTimePicker(
    BuildContext context,
    DateTime initial,
  ) async {
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: initial,
      lastDate: initial.add(const Duration(days: 7)),
    );
    if (date == null) return null;
    if (!context.mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  int _calculateFee() {
    return 50;
  }

  void _handleBooking() async {
    if (_selectedVehicleId == null) {
      _showSnack("Please select your vehicle");
      return;
    }
    if (_selectedSlotId == null) {
      _showSnack("Please select a slot");
      return;
    }
    if (_selectedTime == null) {
      _showSnack("Please select a booking time");
      return;
    }

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    setState(() => _isLoading = false);

    _showSuccessDialog();
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: Colors.green,
                size: 50,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              "Booking Confirmed!",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Slot $_selectedSlotCode has been reserved for $_selectedVehiclePlate",
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2E7D32),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  "Done",
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fee = _calculateFee();

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1565C0), Color(0xFF2E7D32)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom AppBar
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Colors.white.withOpacity(0.3),
                          ),
                        ),
                        child: const Icon(
                          Icons.arrow_back_ios_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                    const Expanded(
                      child: Text(
                        "Create a Booking",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 42),
                  ],
                ),
              ),

              // Main content card
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF8FFF8),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(30),
                      topRight: Radius.circular(30),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 8),

                        // Car park image
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            height: 160,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(16),
                              image: const DecorationImage(
                                image: AssetImage('assets/images/carPark.jpg'),
                                fit: BoxFit.cover,
                              ),
                            ),
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                gradient: LinearGradient(
                                  colors: [
                                    Colors.black.withOpacity(0.4),
                                    Colors.transparent,
                                  ],
                                  begin: Alignment.bottomCenter,
                                  end: Alignment.topCenter,
                                ),
                              ),
                              child: const Align(
                                alignment: Alignment.bottomLeft,
                                child: Padding(
                                  padding: EdgeInsets.all(12),
                                  child: Text(
                                    "NSBM Parking Area",
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Vehicle selector
                        _sectionLabel("Select Vehicle"),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _selectedVehicleId,
                          hint: const Text("Choose your vehicle"),
                          decoration: _dropdownDecoration(),
                          items: _userVehicles.map((vehicle) {
                            final isCar = vehicle["type"] == "car";
                            return DropdownMenuItem<String>(
                              value: vehicle["id"] as String,
                              child: Row(
                                children: [
                                  Icon(
                                    isCar
                                        ? Icons.directions_car_rounded
                                        : Icons.two_wheeler_rounded,
                                    size: 18,
                                    color: isCar
                                        ? const Color(0xFF1565C0)
                                        : const Color(0xFF2E7D32),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(vehicle["plate_number"] as String),
                                  const SizedBox(width: 8),
                                  Text(
                                    "(${vehicle["type"]})",
                                    style: const TextStyle(
                                      color: Colors.grey,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedVehicleId = value;
                              _selectedVehiclePlate =
                                  _userVehicles.firstWhere(
                                        (v) => v["id"] == value,
                                      )["plate_number"]
                                      as String;
                              // Reset slot when vehicle changes
                              _selectedSlotId = null;
                              _selectedSlotCode = null;
                            });
                          },
                        ),
                        const SizedBox(height: 16),

                        // Slot selector
                        _sectionLabel("Select Slot"),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _selectedSlotId,
                          hint: Text(
                            _selectedVehicleId == null
                                ? "Select vehicle first"
                                : "Choose a slot",
                          ),
                          decoration: _dropdownDecoration(),
                          items: _filteredSlots.map((slot) {
                            final isCar = slot["type"] == "car";
                            return DropdownMenuItem<String>(
                              value: slot["id"] as String,
                              child: Row(
                                children: [
                                  Icon(
                                    isCar
                                        ? Icons.directions_car_rounded
                                        : Icons.two_wheeler_rounded,
                                    size: 18,
                                    color: isCar
                                        ? const Color(0xFF1565C0)
                                        : const Color(0xFF2E7D32),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(slot["code"] as String),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: _selectedVehicleId == null
                              ? null
                              : (value) {
                                  setState(() {
                                    _selectedSlotId = value;
                                    _selectedSlotCode =
                                        _availableSlots.firstWhere(
                                              (s) => s["id"] == value,
                                            )["code"]
                                            as String;
                                  });
                                },
                        ),
                        const SizedBox(height: 16),

                        // Booking time
                        _sectionLabel("Booking Time"),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: _pickTime,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 16,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[300]!),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.calendar_today_rounded,
                                  size: 18,
                                  color: _selectedTime == null
                                      ? Colors.grey
                                      : const Color(0xFF1565C0),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  _selectedTime == null
                                      ? "Pick a date & time"
                                      : "${_selectedTime!.day}/${_selectedTime!.month}/${_selectedTime!.year}  ${_selectedTime!.hour.toString().padLeft(2, '0')}:${_selectedTime!.minute.toString().padLeft(2, '0')}",
                                  style: TextStyle(
                                    color: _selectedTime == null
                                        ? Colors.grey
                                        : Colors.black,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Fee and wallet info
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey[200]!),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    "Parking Fee",
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    "LKR $fee",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1565C0),
                                      fontSize: 16,
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.account_balance_wallet_rounded,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      const SizedBox(width: 6),
                                      const Text(
                                        "Wallet Balance",
                                        style: TextStyle(
                                          color: Colors.grey,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const Text(
                                    "LKR 0",
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Confirm button
                        SizedBox(
                          width: double.infinity,
                          height: 55,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _handleBooking,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1565C0),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : const Text(
                                    "Confirm Booking",
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontWeight: FontWeight.bold,
        fontSize: 14,
        color: Color(0xFF1A1A1A),
      ),
    );
  }

  InputDecoration _dropdownDecoration() {
    return InputDecoration(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey[300]!),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF1565C0), width: 2),
      ),
    );
  }
}
