import { SuiClient } from "@mysten/sui/client";

const PARENT_ID = "0xe64cd9db9f829c6cc405d9790bd71567ae07259855f4fba6f02c84f52298c106";
const DOMAIN_TYPE = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::domain::Domain";

interface DomainRecordResponse {
  content: {
    fields: {
      value: {
        fields: {
          target_address: string;
        };
      };
    };
  };
}

/**
 * Retrieves the address associated with a given domain from the Sui blockchain.
 * @param {string} domain - The domain name to look up.
 * @param {string} suiClientUrl - The URL of the Sui client to use.
 * @return {Promise<string | null>} The address associated with the domain or null if the domain is not found.
 */
export async function getAddressByDomain(domain: string, suiClientUrl: string): Promise<string | null> {
  const provider = new SuiClient({ url: suiClientUrl });
  const domainRecord = await provider.getDynamicFieldObject({
    parentId: PARENT_ID,
    name: {
      type: DOMAIN_TYPE,
      value: ["sui", domain],
    },
  });

  if (!isDomainRecordResponse(domainRecord.data)) {
    return null;
  }

  return domainRecord.data.content.fields.value.fields.target_address;
}

/**
 * Checks if the given data is a valid domain record response.
 * @param {unknown} data - The data to check.
 * @return {boolean} True if the data is a valid domain record response, false otherwise.
 */
function isDomainRecordResponse(data: unknown): data is DomainRecordResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "content" in data &&
    data.content !== null &&
    typeof data.content === "object" &&
    "fields" in data.content &&
    data.content.fields !== null &&
    typeof data.content.fields === "object" &&
    "value" in data.content.fields &&
    data.content.fields.value !== null &&
    typeof data.content.fields.value === "object" &&
    "fields" in data.content.fields.value &&
    data.content.fields.value.fields !== null &&
    typeof data.content.fields.value.fields === "object" &&
    "target_address" in data.content.fields.value.fields &&
    typeof data.content.fields.value.fields.target_address === "string"
  );
}
