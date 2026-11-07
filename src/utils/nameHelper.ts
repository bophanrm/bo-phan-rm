/**
 * Trả về Họ và Tên đầy đủ của nhân sự (bỏ chức danh trong ngoặc nếu includeRole = false)
 * @param fullName Tên đầy đủ kèm chức danh, VD: "Tống Trường Xa (Phó Giám Đốc)"
 * @param includeRole Nếu true thì giữ lại chức danh trong ngoặc, nếu false thì lấy Họ và Tên đầy đủ
 */
export function getPersonalName(fullName?: string, includeRole: boolean = false): string {
  if (!fullName) return '';
  const roleMatch = fullName.match(/\s*(\(.*?\))/);
  const role = roleMatch ? roleMatch[1].trim() : '';
  const clean = fullName.replace(/\s*\(.*?\)/g, '').trim();
  return includeRole && role ? `${clean} ${role}` : clean;
}
