import api from "../../src/api";

/**
 * Simple test to verify DynamicExecutor discovery
 */
export default async function test_simple(
  connection: api.IConnection,
): Promise<void> {
  console.log("✅ Simple test executed successfully!");
  console.log(`  Connection host: ${connection.host}`);
}
