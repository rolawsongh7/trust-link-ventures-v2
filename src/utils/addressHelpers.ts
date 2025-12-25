// Address validation utilities

export interface Address {
  id: string;
  receiver_name: string;
  phone_number: string;
  ghana_digital_address: string;
  region: string;
  city: string;
  street_address: string;
  area?: string;
  additional_directions?: string;
  is_default?: boolean;
}

/**
 * Checks if an address is a placeholder address created during signup
 * These placeholder addresses have known default values that need to be replaced
 */
export const isPlaceholderAddress = (address: Address): boolean => {
  const placeholderPatterns = [
    address.phone_number === '+233000000000',
    address.ghana_digital_address === 'GA-000-0000',
    address.street_address === 'Address to be provided',
    address.street_address.toLowerCase().includes('to be provided'),
  ];
  
  return placeholderPatterns.some(Boolean);
};

/**
 * Checks if user has at least one valid (non-placeholder) address
 */
export const hasValidAddress = (addresses: Address[]): boolean => {
  return addresses.some(addr => !isPlaceholderAddress(addr));
};

/**
 * Gets the count of valid (non-placeholder) addresses
 */
export const getValidAddressCount = (addresses: Address[]): number => {
  return addresses.filter(addr => !isPlaceholderAddress(addr)).length;
};
