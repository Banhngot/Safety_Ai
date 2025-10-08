import React, { useState, useMemo } from "react";

// ==== Types ====
type UserRole = "user" | "admin" | "organization";

interface User {
  username: string;
  role: UserRole;
}

type CaseType = "case_note" | "school_report" | "medical_document";
type AbuseLevel = "low" | "medium" | "serious";
type Gender = "male" | "female" | "other";

interface CaseData {
  id: number;
  type: CaseType;
  childName: string;
  childAge: number;
  childGender: Gender;
  content: string;
  extracted: string;
  date: string;
  prediction: AbuseLevel;
  notified: boolean;
  matchedKeywords: string[];
  createdBy: UserRole;
  lastEditedBy?: UserRole;
}

interface DetectionResult {
  level: AbuseLevel;
  matchedKeywords: string[];
  reasoning: string;
}

interface LevelIndicators {
  keywords: string[];
  bruisePercentage?: { min: number; max: number };
}

// ==== Configuration ====
const ABUSE_INDICATORS: Record<AbuseLevel, LevelIndicators> = {
  low: {
    keywords: ["trầy xước", "trầy da", "xước nhẹ", "xước"],
    bruisePercentage: { min: 0, max: 20 },
  },
  medium: {
    keywords: ["bầm tím", "sưng tấy", "bầm", "sưng"],
    bruisePercentage: { min: 20, max: 50 },
  },
  serious: {
    keywords: [
      "chảy máu",
      "xuất huyết",
      "gãy xương",
      "vết bầm lớn",
      "bạo hành",
      "đánh đập",
    ],
    bruisePercentage: { min: 50, max: 100 },
  },
};

const USERS: User[] = [
  { username: "admin", role: "admin" },
  { username: "user", role: "user" },
  { username: "organization", role: "organization" },
];

const DEMO_PASSWORD = "123";

// ==== Detection Logic ====

function extractPercentage(content: string): number | null {
  const percentMatch = content.match(/(\d+)\s*%/);
  return percentMatch ? parseInt(percentMatch[1], 10) : null;
}

function checkLevel(
  normalized: string,
  indicators: LevelIndicators
): { found: boolean; keywords: string[]; reasoning: string } {
  const matchedKeywords: string[] = [];

  for (const keyword of indicators.keywords) {
    if (normalized.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  const percentage = extractPercentage(normalized);
  if (
    percentage !== null &&
    indicators.bruisePercentage &&
    normalized.includes("bầm")
  ) {
    const { min, max } = indicators.bruisePercentage;
    if (percentage > min && percentage <= max) {
      matchedKeywords.push(`bầm tím ${percentage}%`);
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      found: true,
      keywords: matchedKeywords,
      reasoning: `Phát hiện: ${matchedKeywords.join(", ")}`,
    };
  }

  return {
    found: false,
    keywords: [],
    reasoning: "",
  };
}

function detectAbuseLevel(content: string): DetectionResult {
  const normalized = content.trim().toLowerCase();

  const seriousMatch = checkLevel(normalized, ABUSE_INDICATORS.serious);
  if (seriousMatch.found) {
    return {
      level: "serious",
      matchedKeywords: seriousMatch.keywords,
      reasoning: seriousMatch.reasoning,
    };
  }

  const mediumMatch = checkLevel(normalized, ABUSE_INDICATORS.medium);
  if (mediumMatch.found) {
    return {
      level: "medium",
      matchedKeywords: mediumMatch.keywords,
      reasoning: mediumMatch.reasoning,
    };
  }

  const lowMatch = checkLevel(normalized, ABUSE_INDICATORS.low);
  if (lowMatch.found) {
    return {
      level: "low",
      matchedKeywords: lowMatch.keywords,
      reasoning: lowMatch.reasoning,
    };
  }

  return {
    level: "low",
    matchedKeywords: [],
    reasoning: "Không phát hiện dấu hiệu bất thường",
  };
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginErr, setLoginErr] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [cases, setCases] = useState<CaseData[]>([]);
  const [caseType, setCaseType] = useState<CaseType>("case_note");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [childGender, setChildGender] = useState<Gender>("male");
  const [content, setContent] = useState("");
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = USERS.find(
      (u) => u.username === username && password === DEMO_PASSWORD
    );

    if (found) {
      setUser(found);
      setLoginErr("");
    } else {
      setLoginErr("Sai tài khoản hoặc mật khẩu");
    }
  };

  const handleAddCase = (e: React.FormEvent) => {
    e.preventDefault();

    if (!childName.trim() || !childAge.trim() || !content.trim()) {
      alert("Tên trẻ, tuổi và nội dung không được để trống");
      return;
    }

    const ageNum = parseInt(childAge, 10);
    if (isNaN(ageNum) || ageNum <= 0) {
      alert("Tuổi phải là số dương hợp lệ");
      return;
    }

    if (editingCaseId && user!.role === "user") {
      alert("Bạn không có quyền chỉnh sửa dữ liệu.");
      return;
    }

    const detection = detectAbuseLevel(content);

    const newCase: CaseData = {
      id: editingCaseId || Date.now(),
      type: caseType,
      childName: childName.trim(),
      childAge: ageNum,
      childGender,
      content,
      extracted: detection.reasoning,
      date: new Date().toISOString().slice(0, 10),
      prediction: detection.level,
      notified: detection.level === "serious",
      matchedKeywords: detection.matchedKeywords,
      createdBy: editingCaseId
        ? cases.find((c) => c.id === editingCaseId)!.createdBy
        : user!.role,
      lastEditedBy: editingCaseId ? user!.role : undefined,
    };

    // Improved duplicate checking: match by name (case-insensitive), age, and gender
    const existingCases = cases.filter(
      (c) =>
        c.childName.toLowerCase() === childName.trim().toLowerCase() &&
        c.childAge === ageNum &&
        c.childGender === childGender &&
        c.id !== editingCaseId
    );

    if (existingCases.length > 0) {
      let message = `Phát hiện thông tin trùng lặp cho trẻ "${childName.trim()}" (Tuổi: ${ageNum}, Giới tính: ${
        childGender === "male"
          ? "Nam"
          : childGender === "female"
          ? "Nữ"
          : "Khác"
      }). Các case trước đây:\n`;
      existingCases.forEach((c, index) => {
        message += `\nCase ${index + 1} (${c.date}):\n`;
        message += `Loại: ${c.type}\n`;
        message += `Nội dung: ${c.content}\n`;
        message += `Trích xuất: ${c.extracted}\n`;
        message += `Dự đoán: ${
          c.prediction === "serious"
            ? "Nghiêm trọng"
            : c.prediction === "medium"
            ? "Vừa"
            : "Thấp"
        }\n`;
        message += `Từ khóa khớp: ${
          c.matchedKeywords.length > 0 ? c.matchedKeywords.join(", ") : "-"
        }\n`;
      });
      alert(message);
    } else {
      alert(
        editingCaseId
          ? `Đã cập nhật thông tin cho trẻ "${childName.trim()}".`
          : `Đã thêm thông tin mới cho trẻ "${childName.trim()}".`
      );
    }

    if (editingCaseId) {
      setCases((prev) =>
        prev.map((c) => (c.id === editingCaseId ? newCase : c))
      );
    } else {
      setCases((prev) => [newCase, ...prev]);
    }

    setChildName("");
    setChildAge("");
    setChildGender("male");
    setContent("");
    setCaseType("case_note");
    setEditingCaseId(null);
  };

  const handleEditCase = (caseData: CaseData) => {
    if (user!.role === "user") {
      alert("Bạn không có quyền chỉnh sửa dữ liệu.");
      return;
    }
    setEditingCaseId(caseData.id);
    setCaseType(caseData.type);
    setChildName(caseData.childName);
    setChildAge(caseData.childAge.toString());
    setChildGender(caseData.childGender);
    setContent(caseData.content);
  };

  const handleDeleteCase = (id: number) => {
    if (user!.role === "user") {
      alert("Bạn không có quyền xóa dữ liệu.");
      return;
    }
    if (window.confirm("Bạn có chắc muốn xóa trường hợp này?")) {
      setCases((prev) => prev.filter((c) => c.id !== id));
      alert("Đã xóa trường hợp.");
    }
  };

  const stats = useMemo(() => {
    const filteredCases =
      user?.role === "organization"
        ? cases.filter((c) => c.prediction === "serious")
        : user?.role === "user"
        ? cases.filter((c) => c.createdBy === "user" && !c.lastEditedBy)
        : cases.filter(
            (c) =>
              c.createdBy !== "organization" &&
              c.lastEditedBy !== "organization"
          );

    const total = filteredCases.length;
    const serious = filteredCases.filter(
      (c) => c.prediction === "serious"
    ).length;
    const medium = filteredCases.filter(
      (c) => c.prediction === "medium"
    ).length;
    const low = filteredCases.filter((c) => c.prediction === "low").length;
    const hasSerious = filteredCases.some(
      (c) => c.prediction === "serious" && c.notified
    );

    return { total, serious, medium, low, hasSerious };
  }, [cases, user]);

  // Filter cases for display based on user role
  const displayedCases =
    user?.role === "organization"
      ? cases.filter((c) => c.prediction === "serious")
      : user?.role === "user"
      ? cases.filter((c) => c.createdBy === "user" && !c.lastEditedBy)
      : cases.filter(
          (c) =>
            c.createdBy !== "organization" && c.lastEditedBy !== "organization"
        );

  if (!user) {
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
        <div>
          <label
            htmlFor="username"
            style={{ display: "block", marginBottom: 4 }}
          >
            Tài khoản:
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tài khoản"
            style={{ width: "100%", marginBottom: 12, padding: 8 }}
          />

          <label
            htmlFor="password"
            style={{ display: "block", marginBottom: 4 }}
          >
            Mật khẩu:
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            style={{ width: "100%", marginBottom: 12, padding: 8 }}
          />

          <button onClick={handleLogin} style={{ width: "100%", padding: 10 }}>
            Đăng nhập
          </button>
        </div>

        {loginErr && (
          <div style={{ color: "red", marginTop: 12, fontWeight: "bold" }}>
            {loginErr}
          </div>
        )}

        <div
          style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: "#f5f5f5",
            borderRadius: 4,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            Tài khoản: <b>admin</b>, <b>user</b>, hoặc <b>organization</b>
          </div>
          <div>
            Mật khẩu: <b>123</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "30px auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2>Hệ thống phát hiện & cảnh báo bạo hành trẻ em</h2>
        <div>
          Xin chào, <b>{user.username}</b> ({user.role}){" "}
          <button onClick={() => setUser(null)} style={{ marginLeft: 8 }}>
            Đăng xuất
          </button>
        </div>
      </div>

      <hr />

      <div
        style={{
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
          marginTop: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3>{editingCaseId ? "Chỉnh sửa dữ liệu" : "Nhập dữ liệu mới"}</h3>
          <div>
            <label htmlFor="type" style={{ display: "block", marginBottom: 4 }}>
              Loại tài liệu:
            </label>
            <select
              id="type"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              style={{ width: "100%", marginBottom: 12, padding: 8 }}
            >
              <option value="case_note">Case Note</option>
              <option value="school_report">School Report</option>
              <option value="medical_document">Medical Document</option>
            </select>

            <label
              htmlFor="childName"
              style={{ display: "block", marginBottom: 4 }}
            >
              Tên trẻ:
            </label>
            <input
              id="childName"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Nhập tên trẻ"
              style={{ width: "100%", marginBottom: 12, padding: 8 }}
            />

            <label
              htmlFor="childAge"
              style={{ display: "block", marginBottom: 4 }}
            >
              Tuổi trẻ:
            </label>
            <input
              id="childAge"
              type="number"
              value={childAge}
              onChange={(e) => setChildAge(e.target.value)}
              placeholder="Nhập tuổi trẻ"
              style={{ width: "100%", marginBottom: 12, padding: 8 }}
            />

            <label
              htmlFor="childGender"
              style={{ display: "block", marginBottom: 4 }}
            >
              Giới tính trẻ:
            </label>
            <select
              id="childGender"
              value={childGender}
              onChange={(e) => setChildGender(e.target.value as Gender)}
              style={{ width: "100%", marginBottom: 12, padding: 8 }}
            >
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>

            <label
              htmlFor="content"
              style={{ display: "block", marginBottom: 4 }}
            >
              Nội dung:
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung..."
              style={{
                width: "100%",
                height: 100,
                marginBottom: 12,
                padding: 8,
              }}
            />

            <button
              onClick={handleAddCase}
              style={{ width: "100%", padding: 10 }}
            >
              {editingCaseId ? "Cập nhật" : "Gửi và phân tích"}
            </button>
            {editingCaseId &&
              (user.role === "admin" || user.role === "organization") && (
                <button
                  onClick={() => {
                    setChildName("");
                    setChildAge("");
                    setChildGender("male");
                    setContent("");
                    setCaseType("case_note");
                    setEditingCaseId(null);
                  }}
                  style={{
                    width: "100%",
                    padding: 10,
                    marginTop: 8,
                    backgroundColor: "#ccc",
                  }}
                >
                  Hủy chỉnh sửa
                </button>
              )}
          </div>

          {stats.hasSerious && (
            <div
              style={{
                color: "red",
                fontWeight: "bold",
                marginTop: 16,
                padding: 12,
                backgroundColor: "#ffebee",
                borderRadius: 4,
                border: "1px solid red",
              }}
            >
              ⚠️ Phát hiện trường hợp nghiêm trọng! Đã gửi cảnh báo tới tổ chức
              liên quan.
            </div>
          )}
        </div>

        {(user.role === "admin" || user.role === "organization") && (
          <div
            style={{
              minWidth: 220,
              padding: 16,
              backgroundColor: "#f5f5f5",
              borderRadius: 8,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Thống kê</h3>
            <p>
              Tổng số trường hợp: <b>{stats.total}</b>
            </p>
            <p>
              Nghiêm trọng: <b style={{ color: "red" }}>{stats.serious}</b>
            </p>
            <p>
              Vừa: <b style={{ color: "orange" }}>{stats.medium}</b>
            </p>
            <p>
              Thấp: <b style={{ color: "green" }}>{stats.low}</b>
            </p>
          </div>
        )}
      </div>

      <h3 style={{ marginTop: 32 }}>Lịch sử dữ liệu</h3>
      <div style={{ overflowX: "auto" }}>
        <table
          border={1}
          cellPadding={10}
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead style={{ backgroundColor: "#e0e0e0" }}>
            <tr>
              <th>Loại</th>
              <th>Tên trẻ</th>
              <th>Tuổi</th>
              <th>Giới tính</th>
              <th>Nội dung</th>
              <th>Trích xuất (NLP)</th>
              <th>Từ khóa khớp</th>
              <th>Dự đoán AI</th>
              <th>Ngày</th>
              {(user.role === "admin" || user.role === "organization") && (
                <th>Hành động</th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayedCases.length === 0 ? (
              <tr>
                <td
                  colSpan={user.role === "user" ? 9 : 10}
                  style={{ textAlign: "center", color: "#999" }}
                >
                  Chưa có dữ liệu
                </td>
              </tr>
            ) : (
              displayedCases.map((c) => (
                <tr key={c.id}>
                  <td>{c.type}</td>
                  <td>{c.childName}</td>
                  <td>{c.childAge}</td>
                  <td>
                    {c.childGender === "male"
                      ? "Nam"
                      : c.childGender === "female"
                      ? "Nữ"
                      : "Khác"}
                  </td>
                  <td style={{ maxWidth: 250 }}>{c.content}</td>
                  <td>{c.extracted}</td>
                  <td>
                    {c.matchedKeywords.length > 0
                      ? c.matchedKeywords.join(", ")
                      : "-"}
                  </td>
                  <td
                    style={{
                      color:
                        c.prediction === "serious"
                          ? "red"
                          : c.prediction === "medium"
                          ? "orange"
                          : "green",
                      fontWeight:
                        c.prediction === "serious" ? "bold" : "normal",
                    }}
                  >
                    {c.prediction === "serious"
                      ? "Nghiêm trọng"
                      : c.prediction === "medium"
                      ? "Vừa"
                      : "Thấp"}
                  </td>
                  <td>{c.date}</td>
                  {(user.role === "admin" || user.role === "organization") && (
                    <td>
                      <button
                        onClick={() => handleEditCase(c)}
                        style={{ marginRight: 8 }}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteCase(c.id)}
                        style={{ backgroundColor: "#ff4444" }}
                      >
                        Xóa
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 32,
          padding: 16,
          backgroundColor: "#e3f2fd",
          borderRadius: 8,
        }}
      >
        <b>Hướng dẫn sử dụng:</b>
        <ul style={{ marginTop: 8, marginBottom: 0 }}>
          <li>
            <b>Thấp:</b> trầy xước, xước nhẹ, bầm tím dưới 20%
          </li>
          <li>
            <b>Vừa:</b> bầm tím, sưng tấy, bầm tím 20-50%
          </li>
          <li>
            <b>Nghiêm trọng:</b> chảy máu, bạo hành, đánh đập, bầm tím trên 50%
          </li>
        </ul>
        <div style={{ marginTop: 8, fontStyle: "italic" }}>
          Ví dụ: "Trẻ bị bầm tím 60%" sẽ được phân loại nghiêm trọng
        </div>
      </div>
    </div>
  );
}

export default App;
