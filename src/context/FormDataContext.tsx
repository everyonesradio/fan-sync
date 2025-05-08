import { createContext, useContext, useState, useMemo } from "react";

interface FormDataContextType {
  formData: FormDataType;
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
}

export interface FormDataType {
  uuid: string;
  fullname: string;
  email: string;
  username: string;
  dob: string;
  location: string;
  fileURL?: string;
  files?: File[];
}

export const initialFormData: FormDataType = {
  uuid: "",
  fullname: "",
  email: "",
  username: "",
  dob: "",
  location: "",
};

interface FormProviderProps {
  children: React.ReactNode;
}

const FormDataContext = createContext<FormDataContextType | null>(null);

export const useFormContext = () => {
  const context = useContext(FormDataContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormDataProvider");
  }
  return context;
};

export const FormDataProvider: React.FC<FormProviderProps> = ({ children }) => {
  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const formDataMemoized = useMemo(
    () => ({ formData, setFormData }),
    [formData]
  );

  return (
    <FormDataContext.Provider value={formDataMemoized}>
      {children}
    </FormDataContext.Provider>
  );
};
