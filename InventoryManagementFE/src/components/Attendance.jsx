import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { FaCalendarAlt, FaSave, FaCheck, FaTimes, FaInfoCircle, FaSearch } from "react-icons/fa";

const Attendance = () => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  useEffect(() => {
    fetchAttendanceForDate();
  }, [date]);

  const fetchAttendanceForDate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/attendance/date?date=${date}`);
      if (res.data && res.data.records) {
        setRecords(res.data.records);
      }
    } catch (err) {
      console.error("Error fetching attendance:", err);
      alert("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (employeeId, newStatus) => {
    setRecords(records.map(rec => 
      rec.employee_id === employeeId ? { ...rec, status: newStatus } : rec
    ));
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      await api.post("/hr/attendance/bulk-mark", { records });
      alert("Attendance saved successfully");
      fetchAttendanceForDate();
    } catch (err) {
      console.error("Error saving attendance:", err);
      alert("Failed to save attendance");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(rec => 
    rec.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#10b981'; // green
      case 'absent': return '#ef4444'; // red
      case 'half_day': return '#f59e0b'; // orange
      case 'permission': return '#3b82f6'; // blue
      case 'paid_leave': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  // Styles
  const styles = {
    container: {
      padding: "30px 40px",
      backgroundColor: "#0a0c10",
      minHeight: "100vh",
      color: "#e5e7eb",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "30px",
      backgroundColor: "#1f2937",
      padding: "20px 30px",
      borderRadius: "12px",
      border: "1px solid #374151",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    title: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#f9fafb",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    controls: {
      display: "flex",
      gap: "15px",
      alignItems: "center",
    },
    dateInput: {
      padding: "10px 15px",
      borderRadius: "8px",
      border: "1px solid #4b5563",
      backgroundColor: "#111827",
      color: "#f9fafb",
      fontSize: "14px",
    },
    searchInput: {
      padding: "10px 15px",
      paddingLeft: "35px",
      borderRadius: "8px",
      border: "1px solid #4b5563",
      backgroundColor: "#111827",
      color: "#f9fafb",
      fontSize: "14px",
      width: "250px",
    },
    searchWrapper: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      color: "#9ca3af",
    },
    saveButton: {
      backgroundColor: "#4f46e5",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
      boxShadow: "0 2px 4px rgba(79, 70, 229, 0.3)",
    },
    tableContainer: {
      backgroundColor: "#1f2937",
      borderRadius: "12px",
      border: "1px solid #374151",
      overflow: "hidden",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "16px 24px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#9ca3af",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      borderBottom: "1px solid #374151",
      backgroundColor: "#111827",
    },
    td: {
      padding: "16px 24px",
      fontSize: "14px",
      color: "#d1d5db",
      borderBottom: "1px solid #374151",
    },
    row: {
      transition: "background-color 0.2s",
    },
    select: {
      padding: "8px 12px",
      borderRadius: "6px",
      border: "1px solid #4b5563",
      backgroundColor: "#111827",
      color: "#f9fafb",
      fontSize: "14px",
      cursor: "pointer",
      width: "100%",
    },
    statusBadge: {
      padding: "6px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      display: "inline-block",
      textAlign: "center",
      minWidth: "100px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FaCalendarAlt color="#4f46e5" />
          Attendance Management
        </h1>
        <div style={styles.controls}>
          <div style={styles.searchWrapper}>
            <FaSearch style={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search employee..." 
              style={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <input 
            type="date" 
            style={styles.dateInput} 
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button 
            style={styles.saveButton} 
            onClick={handleSaveAll}
            disabled={loading}
          >
            <FaSave /> {loading ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Employee Name</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                  {loading ? "Loading attendance records..." : "No active employees found"}
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.employee_id} style={styles.row}>
                  <td style={styles.td}><strong>{rec.employee_code}</strong></td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: "500", color: "#f9fafb" }}>{rec.employee_name}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>{rec.designation}</div>
                  </td>
                  <td style={styles.td}>{rec.department || '-'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: `${getStatusColor(rec.status)}20`,
                      color: getStatusColor(rec.status),
                      border: `1px solid ${getStatusColor(rec.status)}40`
                    }}>
                      {rec.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <select 
                      style={styles.select}
                      value={rec.status}
                      onChange={(e) => handleStatusChange(rec.employee_id, e.target.value)}
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="half_day">Half Day</option>
                      <option value="permission">Permission</option>
                      <option value="paid_leave">Paid Leave</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Attendance;