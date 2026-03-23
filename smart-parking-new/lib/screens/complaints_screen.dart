import 'package:flutter/material.dart';

class ComplaintsScreen extends StatefulWidget {
  const ComplaintsScreen({super.key});

  @override
  State<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends State<ComplaintsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _myBookings = [
    {"id": "1", "slot_code": "C1", "booking_time": "2024-03-10 09:00"},
    {"id": "2", "slot_code": "M2", "booking_time": "2024-03-12 14:00"},
    {"id": "3", "slot_code": "C3", "booking_time": "2024-03-15 08:30"},
  ];

  final List<Map<String, dynamic>> _myComplaints = [
    {
      "id": "1",
      "slot_code": "C1",
      "violation_plate": "WP-9999",
      "description": "Someone parked on my reserved slot",
      "violation_type": "park_on_my_spot",
      "status": "pending",
      "created_at": "2024-03-10 09:30",
    },
    {
      "id": "2",
      "slot_code": "M2",
      "violation_plate": "WP-8888",
      "description": "Vehicle parked incorrectly",
      "violation_type": "other",
      "status": "accepted",
      "created_at": "2024-03-12 14:30",
    },
    {
      "id": "3",
      "slot_code": "C3",
      "violation_plate": "WP-7777",
      "description": "Blocking the entrance",
      "violation_type": "other",
      "status": "declined",
      "created_at": "2024-03-15 09:00",
    },
  ];

  String? _selectedBookingId;
  String? _selectedBookingSlot;
  final _plateController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _violationType = "park_on_my_spot";
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _plateController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _submitComplaint() async {
    if (_selectedBookingId == null) {
      _showSnack("Please select a booking");
      return;
    }
    if (_plateController.text.trim().isEmpty) {
      _showSnack("Please enter the violation plate number");
      return;
    }
    if (_descriptionController.text.trim().isEmpty) {
      _showSnack("Please describe the incident");
      return;
    }

    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;

    setState(() {
      _myComplaints.insert(0, {
        "id": DateTime.now().millisecondsSinceEpoch.toString(),
        "slot_code": _selectedBookingSlot,
        "violation_plate": _plateController.text.trim().toUpperCase(),
        "description": _descriptionController.text.trim(),
        "violation_type": _violationType,
        "status": "pending",
        "created_at": DateTime.now().toString().substring(0, 16),
      });
      _isSubmitting = false;
      _selectedBookingId = null;
      _selectedBookingSlot = null;
      _plateController.clear();
      _descriptionController.clear();
      _violationType = "park_on_my_spot";
    });

    _showSnack("Complaint submitted successfully!");
    _tabController.animateTo(1);
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
                        "Complaints",
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

              // Tab bar on gradient
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 8,
                ),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    labelColor: const Color(0xFF1565C0),
                    unselectedLabelColor: Colors.white,
                    indicator: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    dividerColor: Colors.transparent,
                    tabs: const [
                      Tab(text: "Report Incident"),
                      Tab(text: "My Complaints"),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // White card
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
                  child: TabBarView(
                    controller: _tabController,
                    children: [_buildReportTab(), _buildComplaintsTab()],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReportTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          const Text(
            "Report a parking violation",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            "Select the booking where the violation occurred",
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 20),

          // Select booking
          _sectionLabel("Select Booking"),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedBookingId,
            hint: const Text("Choose a booking"),
            decoration: _dropdownDecoration(),
            items: _myBookings.map((booking) {
              final isCar = (booking["slot_code"] as String).startsWith("C");
              return DropdownMenuItem<String>(
                value: booking["id"] as String,
                child: Row(
                  children: [
                    Icon(
                      isCar
                          ? Icons.directions_car_rounded
                          : Icons.two_wheeler_rounded,
                      size: 16,
                      color: isCar
                          ? const Color(0xFF1565C0)
                          : const Color(0xFF2E7D32),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      "Slot ${booking["slot_code"]} - ${booking["booking_time"]}",
                      style: const TextStyle(fontSize: 13),
                    ),
                  ],
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedBookingId = value;
                _selectedBookingSlot =
                    _myBookings.firstWhere((b) => b["id"] == value)["slot_code"]
                        as String;
              });
            },
          ),
          const SizedBox(height: 16),

          // Violation type
          _sectionLabel("Violation Type"),
          const SizedBox(height: 8),
          Row(
            children: [
              _violationTypeOption(
                "park_on_my_spot",
                "Parked on my spot",
                Icons.no_crash_rounded,
              ),
              const SizedBox(width: 10),
              _violationTypeOption("other", "Other", Icons.report_outlined),
            ],
          ),
          const SizedBox(height: 16),

          // Violation plate
          _sectionLabel("Violation Plate Number"),
          const SizedBox(height: 8),
          TextField(
            controller: _plateController,
            decoration: InputDecoration(
              hintText: "e.g. WP-9999",
              prefixIcon: const Icon(
                Icons.directions_car_rounded,
                color: Color(0xFF1565C0),
                size: 20,
              ),
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
                borderSide: const BorderSide(
                  color: Color(0xFF1565C0),
                  width: 2,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Description
          _sectionLabel("Description"),
          const SizedBox(height: 8),
          TextField(
            controller: _descriptionController,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: "Describe what happened...",
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
                borderSide: const BorderSide(
                  color: Color(0xFF1565C0),
                  width: 2,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Submit button
          SizedBox(
            width: double.infinity,
            height: 55,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submitComplaint,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1565C0),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Text(
                      "Submit Complaint",
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
    );
  }

  Widget _buildComplaintsTab() {
    return _myComplaints.isEmpty
        ? Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.report_off_rounded,
                  size: 60,
                  color: Colors.grey[300],
                ),
                const SizedBox(height: 12),
                const Text(
                  "No complaints submitted yet",
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          )
        : ListView.separated(
            padding: const EdgeInsets.all(24),
            itemCount: _myComplaints.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final complaint = _myComplaints[index];
              return _complaintCard(complaint);
            },
          );
  }

  Widget _complaintCard(Map<String, dynamic> complaint) {
    final status = complaint["status"] as String;
    final color = _statusColor(status);
    final isCar = (complaint["slot_code"] as String).startsWith("C");

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      isCar
                          ? Icons.directions_car_rounded
                          : Icons.two_wheeler_rounded,
                      color: color,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    "Slot ${complaint["slot_code"]}",
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: color),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.directions_car_rounded,
                size: 14,
                color: Colors.grey,
              ),
              const SizedBox(width: 6),
              Text(
                complaint["violation_plate"] as String,
                style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 12),
              const Icon(
                Icons.access_time_rounded,
                size: 14,
                color: Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                complaint["created_at"] as String,
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            complaint["description"] as String,
            style: const TextStyle(fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              complaint["violation_type"].toString().replaceAll('_', ' '),
              style: const TextStyle(color: Colors.grey, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }

  Widget _violationTypeOption(String value, String label, IconData icon) {
    final isSelected = _violationType == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _violationType = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF1565C0).withOpacity(0.1)
                : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF1565C0) : Colors.grey[300]!,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected ? const Color(0xFF1565C0) : Colors.grey,
                size: 24,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: isSelected ? const Color(0xFF1565C0) : Colors.grey,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
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

  Color _statusColor(String status) {
    switch (status) {
      case "pending":
        return Colors.orange;
      case "accepted":
        return Colors.green;
      case "declined":
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
