import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { FaMoneyCheckAlt, FaSearch, FaPrint, FaDownload } from "react-icons/fa";

const Salary = () => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaryData, setSalaryData] = useState({ employees: [], total_payroll: 0 });
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
    fetchSalaryData();
  }, [selectedMonth, selectedYear]);

  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/salary/month?year=${selectedYear}&month=${selectedMonth}`);
      if (res.data) {
        setSalaryData(res.data);
      }
    } catch (err) {
      console.error("Error fetching salary:", err);
      alert("Failed to load salary data");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = (salaryData.employees || []).filter(emp => 
    emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const months = [
    { value: 1, label: "January" }, { value: 2, label: "February" },
    { value: 3, label: "March" }, { value: 4, label: "April" },
    { value: 5, label: "May" }, { value: 6, label: "June" },
    { value: 7, label: "July" }, { value: 8, label: "August" },
    { value: 9, label: "September" }, { value: 10, label: "October" },
    { value: 11, label: "November" }, { value: 12, label: "December" }
  ];

  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i);

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
    select: {
      padding: "10px 15px",
      borderRadius: "8px",
      border: "1px solid #4b5563",
      backgroundColor: "#111827",
      color: "#f9fafb",
      fontSize: "14px",
      cursor: "pointer",
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
    statsCard: {
      backgroundColor: "#4f46e5",
      padding: "20px 30px",
      borderRadius: "12px",
      marginBottom: "30px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
    },
    statValue: {
      fontSize: "36px",
      fontWeight: "700",
      color: "white",
      margin: 0,
    },
    statLabel: {
      fontSize: "14px",
      color: "rgba(255,255,255,0.8)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
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
    badge: {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "600",
      backgroundColor: "#374151",
      color: "#d1d5db",
      marginRight: "4px",
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FaMoneyCheckAlt color="#10b981" />
          Salary Management
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
          <select 
            style={styles.select}
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select 
            style={styles.select}
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.statsCard}>
        <div>
          <p style={styles.statLabel}>Total Payroll for {salaryData.month_name} {salaryData.year}</p>
          <h2 style={styles.statValue}>₹{salaryData.total_payroll?.toFixed(2)}</h2>
        </div>
        <FaMoneyCheckAlt size={48} color="rgba(255,255,255,0.2)" />
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Code</th>
              <th style={styles.th}>Employee Name</th>
              <th style={styles.th}>Per Day (₹)</th>
              <th style={styles.th}>Attendance</th>
              <th style={styles.th}>Deduction</th>
              <th style={styles.th}>Net Salary (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                  {loading ? "Calculating salaries..." : "No records found"}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.employee_id} style={styles.row}>
                  <td style={styles.td}><strong>{emp.employee_code}</strong></td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: "500", color: "#f9fafb" }}>{emp.employee_name}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>{emp.designation || '-'}</div>
                  </td>
                  <td style={styles.td}>{emp.salary_per_day.toFixed(2)}</td>
                  <td style={styles.td}>
                    <div>
                      <span style={styles.badge} title="Present Days">P: {emp.present_days}</span>
                      <span style={{...styles.badge, color: '#ef4444'}} title="Absent Days">A: {emp.absent_days}</span>
                      {emp.half_days > 0 && <span style={{...styles.badge, color: '#f59e0b'}} title="Half Days">H: {emp.half_days}</span>}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                      Total working days: {emp.total_days}
                    </div>
                  </td>
                  <td style={styles.td}><span style={{color: '#ef4444'}}>-{emp.deduction.toFixed(2)}</span></td>
                  <td style={styles.td}>
                    <strong style={{ color: '#10b981', fontSize: '16px' }}>
                      {emp.net_salary.toFixed(2)}
                    </strong>
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

export default Salary;
