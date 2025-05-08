import { createContext, useContext, useState, useEffect, useMemo } from "react";

import { v4 as uuidv4 } from "uuid";

interface LicenseContextValue {
  licenseID: string;
  setLicenseID: (licenseID: string) => void;
}

interface LicenseProviderProps {
  children: React.ReactNode;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
};

export const LicenseProvider: React.FC<LicenseProviderProps> = ({
  children,
}) => {
  const [licenseID, setLicenseID] = useState<string>("");

  // Generate a License ID when the component mounts
  useEffect(() => {
    const newLicenseId = generateLicenseId();
    setLicenseID(newLicenseId);
  }, []);

  const licenseValue = useMemo(
    () => ({ licenseID, setLicenseID }),
    [licenseID, setLicenseID]
  );

  return (
    <LicenseContext.Provider value={licenseValue}>
      {children}
    </LicenseContext.Provider>
  );
};

// Function to generate a License ID
const generateLicenseId = () => {
  // Generate a UUID
  const uuid = uuidv4();
  const mixedString = uuid.replace(/-/g, ""); // Remove hyphens from the UUID
  let letters = "";
  let digits = "";

  // Iterate through the UUID string without hyphens using a for-of loop
  for (const char of mixedString) {
    // Check if the character is a letter and we haven't collected 3 letters yet
    if (/[a-z]/i.exec(char) && letters.length < 3) {
      letters += char;
    }
    // Check if the character is a digit and we haven't collected 8 digits yet
    else if (/\d/.exec(char) && digits.length < 8) {
      digits += char;
    }
    // Stop the loop if we have collected 3 letters and 8 digits
    if (letters.length === 3 && digits.length === 8) {
      break;
    }
  }

  // Combine the letters and digits
  const id = letters + digits;
  const formattedId = id.toUpperCase();
  return formattedId;
};
