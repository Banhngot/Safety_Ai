import React, { useState } from "react";

// ==== Types ====
type UserRole = "user" | "admin";
interface User {
  username: string;
  role: UserRole;
}
type CaseType = "case_note" | "school_report" | "medical_document";
type AbuseLevel = "low" | "medium" | "serious";
interface CaseData {
  id: number;
  type: CaseType;
  content: string;
  extracted: string;
  date: string;
  prediction: AbuseLevel;
  notified: boolean;
}

// ==== Fake Auth ====
const USERS: User[] = [
  { username: "admin", role: "admin" },
  { username: "user", role: "user" },
];

// ==== NLP & AI ====
function extractInfo(content: string): string {
  // Chuẩn hóa nội dung về chữ thường và loại bỏ dấu cách thừa
  const normalized = content.trim().toLowerCase();
  if (normalized.includes("bạo hành")) {
    return "Có dấu hiệu bạo hành nghiêm trọng";
  }
  if (normalized.includes("bạo lực")) {
    return "Có dấu hiệu bạo lực (mức vừa)";
  }
  return "Không phát hiện dấu hiệu bất thường";
}

function predictSerious(extracted: string): AbuseLevel {
  if (extracted === "Có dấu hiệu bạo hành nghiêm trọng") return "serious";
  if (extracted === "Có dấu hiệu bạo lực (mức vừa)") return "medium";
  return "low";
}

// ==== Main App ====
function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [loginErr, setLoginErr] = useState("");
  // Data state
  const [cases, setCases] = useState<CaseData[]>([]);
  const [refresh, setRefresh] = useState(0);

  // Login
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem("username") as HTMLInputElement)
      .value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;
    const found = USERS.find(
      (u) => u.username === username && password === "123"
    );
    if (found) {
      setUser(found);
      setLoginErr("");
    } else {
      setLoginErr("Sai tài khoản hoặc mật khẩu");
    }
  }

  // Data entry
  function handleAddCase(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const type = (form.elements.namedItem("type") as HTMLSelectElement)
      .value as CaseType;
    const content = (form.elements.namedItem("content") as HTMLTextAreaElement)
      .value;
    const extracted = extractInfo(content);
    const prediction = predictSerious(extracted);
    const newCase: CaseData = {
      id: Date.now(),
      type,
      content,
      extracted,
      date: new Date().toISOString().slice(0, 10),
      prediction,
      notified: prediction === "serious",
    };
    setCases((prev) => [newCase, ...prev]);
    form.reset();
    setRefresh((r) => r + 1);
  }

  // Stats
  const total = cases.length;
  const serious = cases.filter((c) => c.prediction === "serious").length;
  const medium = cases.filter((c) => c.prediction === "medium").length;
  const low = cases.filter((c) => c.prediction === "low").length;
  const hasSerious = cases.some(
    (c) => c.prediction === "serious" && c.notified
  );

  // UI
  if (!user)
    return (
      <div
        style={{
          maxWidth: 350,
          margin: "60px auto",
          padding: 24,
          border: "1px solid #ccc",
          borderRadius: 8,
        }}
      >
        <h2>Đăng nhập</h2>
        <form onSubmit={handleLogin}>
          <input
            name="username"
            placeholder="Tài khoản"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <input
            name="password"
            type="password"
            placeholder="Mật khẩu"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button type="submit" style={{ width: "100%" }}>
            Đăng nhập
          </button>
        </form>
        {loginErr && (
          <div style={{ color: "red", marginTop: 8 }}>{loginErr}</div>
        )}
        <div style={{ marginTop: 16, color: "#888" }}>
          <div>
            Tài khoản: <b>admin</b> hoặc <b>user</b>
          </div>
          <div>
            Mật khẩu: <b>123</b>
          </div>
        </div>
      </div>
    );

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Hệ thống phát hiện & cảnh báo bạo hành trẻ em</h2>
        <div>
          Xin chào, <b>{user.username}</b> ({user.role}){" "}
          <button onClick={() => setUser(null)}>Đăng xuất</button>
        </div>
      </div>
      <hr />
      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        {/* Data Entry */}
        <div style={{ flex: 1 }}>
          <h3>Nhập dữ liệu mới</h3>
          <form onSubmit={handleAddCase}>
            <select name="type" style={{ width: "100%", marginBottom: 8 }}>
              <option value="case_note">Case Note</option>
              <option value="school_report">School Report</option>
              <option value="medical_document">Medical Document</option>
            </select>
            <textarea
              name="content"
              placeholder="Nhập nội dung..."
              required
              style={{ width: "100%", height: 60, marginBottom: 8 }}
            />
            <button type="submit" style={{ width: "100%" }}>
              Gửi
            </button>
          </form>
          {hasSerious && (
            <div style={{ color: "red", fontWeight: "bold", marginTop: 16 }}>
              ⚠️ Phát hiện trường hợp nghiêm trọng! Đã gửi cảnh báo tới tổ chức
              liên quan.
            </div>
          )}
        </div>
        {/* Stats */}
        <div style={{ minWidth: 220 }}>
          <h3>Thống kê</h3>
          <p>
            Tổng số trường hợp: <b>{total}</b>
          </p>
          <p>
            Nghiêm trọng: <b style={{ color: "red" }}>{serious}</b>
          </p>
          <p>
            Vừa: <b style={{ color: "orange" }}>{medium}</b>
          </p>
          <p>
            Thấp: <b style={{ color: "green" }}>{low}</b>
          </p>
        </div>
      </div>
      {/* Table */}
      <h3 style={{ marginTop: 32 }}>Lịch sử dữ liệu</h3>
      <table
        border={1}
        cellPadding={6}
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Loại</th>
            <th>Nội dung</th>
            <th>Trích xuất (NLP)</th>
            <th>Dự đoán AI</th>
            <th>Ngày</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td>{c.type}</td>
              <td>{c.content}</td>
              <td>{c.extracted}</td>
              <td
                style={{
                  color:
                    c.prediction === "serious"
                      ? "red"
                      : c.prediction === "medium"
                      ? "orange"
                      : "green",
                  fontWeight: c.prediction === "serious" ? "bold" : undefined,
                }}
              >
                {c.prediction === "serious"
                  ? "Nghiêm trọng"
                  : c.prediction === "medium"
                  ? "Vừa"
                  : "Thấp"}
              </td>
              <td>{c.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 32, color: "#888" }}>
        <b>Hướng dẫn:</b> Nhập nội dung có chứa từ <b>"bạo lực"</b> để hệ thống
        nhận diện mức vừa, <b>"bạo hành"</b> để nhận diện nghiêm trọng và gửi
        cảnh báo.
      </div>
    </div>
  );
}

export default App;
