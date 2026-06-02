import mysql from "mysql2/promise";

class SQLManager {
  constructor(dbconfig) {
    this.sqldbconfig = dbconfig;
    this.sqldb = null;
  }

  async connect() {
    this.sqldb = await mysql.createPool(this.sqldbconfig);
    return this.sqldb;
  }

  async getConnection() {
    if (!this.sqldb) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return await this.sqldb.getConnection();
  }

  // Generic raw query executor
  async query(sql, params = []) {
    if (!this.sqldb) {
      throw new Error("Database not connected. Call connect() first.");
    }
    // mysql2/promise returns [rows, fields]. We extract the first element.
    const [result] = await this.sqldb.query(sql, params);
    return result;
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  // CREATE (Insert)
  async create(table, data) {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error("No data provided for insert.");
    }

    const rows = Array.isArray(data) ? data : [data];
    const columns = Object.keys(rows[0]);
    const rowPlaceholders = `(${columns.map(() => "?").join(", ")})`;
    const allPlaceholders = rows.map(() => rowPlaceholders).join(", ");
    const flatValues = rows.flatMap((row) => columns.map((col) => row[col]));

    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${allPlaceholders}`;
    return await this.query(sql, flatValues);
  }

  // READ (Select)
  async read(table, conditions = {}, columns = ["*"]) {
    let sql = `SELECT ${columns.join(", ")} FROM ${table}`;
    const keys = Object.keys(conditions);
    const values = [];

    if (keys.length > 0) {
      const whereClause = keys.map((key) => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values.push(...keys.map((key) => conditions[key]));
    }

    return await this.query(sql, values);
  }

  // UPDATE
  async update(table, data, conditions) {
    if (!conditions || Object.keys(conditions).length === 0) {
      throw new Error(
        "Update requires conditions to prevent updating all rows.",
      );
    }

    const setKeys = Object.keys(data);
    const setClause = setKeys.map((key) => `${key} = ?`).join(", ");

    const whereKeys = Object.keys(conditions);
    const whereClause = whereKeys.map((key) => `${key} = ?`).join(" AND ");

    const values = [
      ...setKeys.map((key) => data[key]),
      ...whereKeys.map((key) => conditions[key]),
    ];

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    return await this.query(sql, values);
  }

  // DELETE
  async delete(table, conditions) {
    if (!conditions || Object.keys(conditions).length === 0) {
      throw new Error(
        "Delete requires conditions to prevent wiping the entire table.",
      );
    }

    const keys = Object.keys(conditions);
    const whereClause = keys.map((key) => `${key} = ?`).join(" AND ");
    const values = keys.map((key) => conditions[key]);

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return await this.query(sql, values);
  }
  // UPSERT (Insert new, Update existing)
  async upsert(table, data) {
    console.log("Upsert called with data:", data);
    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error("No data provided for upsert.");
    }

    const rows = Array.isArray(data) ? data : [data];
    const columns = Object.keys(rows[0]);

    // Build the INSERT part
    const rowPlaceholders = `(${columns.map(() => "?").join(", ")})`;
    const allPlaceholders = rows.map(() => rowPlaceholders).join(", ");
    const flatValues = rows.flatMap((row) => columns.map((col) => row[col]));

    // Build the ON DUPLICATE KEY UPDATE part
    const updateCols = columns.filter((col) => col !== "id"); // Never update the ID
    const updateClause = updateCols
      .map((col) => {
        if (col === "version") {
          // Automatically increment the version on update for Optimistic Locking
          return `version = version + 1`;
        }
        return `${col} = VALUES(${col})`;
      })
      .join(", ");

    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${allPlaceholders} ON DUPLICATE KEY UPDATE ${updateClause}`;

    return await this.query(sql, flatValues);
  }
}

export default SQLManager;
