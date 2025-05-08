// ** React/Next.js Imports
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, type ChangeEvent } from "react";

// ** React95 Imports
import { Input, Button } from "@react95/core";

// ** Third-Party Imports
import { TRPCClientError } from "@trpc/client";
import { useForm } from "react-hook-form";

// ** Custom Components, Hooks, Utils, etc.
import { type FormDataType, useFormContext } from "@/context/FormDataContext";
import { useLicense } from "@/context/LicenseContext";
import { api } from "@/utils/trpc";

import { dataURLtoFile } from "../upload";

export interface FormInputs {
  fullname: string;
  email: string;
  username: string;
  dob: string;
  location: string;
}

interface UploadResponse {
  fileURL: string;
}

/**
 * The `Form` component is responsible for collecting fan data.
 * It integrates with React Hook Form for form validation and submission handling.
 *
 * Features:
 * - Input fields for full name, email, username, date of birth, and location.
 * - Validation for required fields and specific input patterns.
 * - Transforms the username input to ensure it starts with "@".
 * - Submits the form data along with an uploaded image to create a new fan record.
 * - Navigates to the anthem page upon successful submission.
 * - Utilizes custom hooks for accessing form data and license context.
 *
 * @params None
 */

const Form = () => {
  const router = useRouter();
  const { licenseID } = useLicense();
  const { formData, setFormData } = useFormContext();
  const { mutateAsync: validateUsername } = api.fans.validate.useMutation();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<FormInputs>({
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  interface StoredFormData {
    data: Partial<FormDataType>;
    savedAt: number;
  }

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!formData?.fileURL) {
      const stored = localStorage.getItem("formData");

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredFormData;
          const expired = Date.now() - parsed.savedAt > 20 * 60 * 1000;

          if (!expired && parsed.data) {
            const parsedData: Partial<FormDataType> = parsed.data;

            if (parsedData.fileURL) {
              const file = dataURLtoFile(parsedData.fileURL, "recovered.png");

              setFormData({
                ...parsedData,
                files: [file],
              } as FormDataType);
            }
          } else {
            localStorage.removeItem("formData");
          }
        } catch (err) {
          console.error("Error restoring formData on /form:", err);
          localStorage.removeItem("formData");
        }
      }
    }

    if (!formData || initializedRef.current) return;

    const fields: (keyof FormInputs)[] = [
      "fullname",
      "email",
      "username",
      "dob",
      "location",
    ];

    fields.forEach((field) => {
      const value = formData[field];
      if (value) {
        setValue(field, value, { shouldValidate: true });
      }
    });

    initializedRef.current = true;

    //only rerun when formData changes, setFormData and setValue are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Handle username input transformation
  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const transformValue = value.startsWith("@") ? value : `@${value}`;
    setValue("username", transformValue);
    clearErrors("username");
  };

  const formSubmission = async (data: FormInputs) => {
    const updatedFormData = {
      ...formData,
      uuid: licenseID,
      ...data,
    };

    setFormData(updatedFormData);

    localStorage.setItem(
      "formData",
      JSON.stringify({
        data: { ...updatedFormData },
        savedAt: Date.now(), // refresh timestamp
      })
    );

    router.push("/anthem");
  };

  const onSubmit = async (data: FormInputs) => {
    if (!licenseID) {
      throw new Error("License ID is not set");
    }
    if (!formData) {
      throw new Error("Image Data is missing");
    }

    try {
      await validateUsername({ username: data.username });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (err instanceof TRPCClientError && err.data?.code === "CONFLICT") {
        setError("username", {
          type: "manual",
          message: err.message || "Username already exists",
        });
        return;
      }
      throw err; // unexpected error
    }

    formSubmission(data);
  };

  return (
    <div className='flex flex-col bg-black items-center justify-center min-h-screen p-8'>
      <h1 className='font-bold text-5xl text-center text-white p-8'>
        Personal Information
      </h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='w-full max-w-md flex flex-col'
      >
        <Input
          {...register("fullname", {
            required: "Full name is required",
          })}
          placeholder='Full Name'
          fullWidth
          className={`${errors.fullname ? "mb-0" : "mb-4"}`}
        />
        {errors.fullname && (
          <p className='mb-4 indent-0.5 font-bold text-red-500'>
            {errors.fullname.message}
          </p>
        )}
        <Input
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: "Email is invalid",
            },
          })}
          placeholder='Email'
          fullWidth
          className={`${errors.email ? "mb-0" : "mb-4"}`}
        />
        {errors.email && (
          <p className='mb-4 indent-0.5 font-bold text-red-500'>
            {errors.email.message}
          </p>
        )}
        <Input
          {...register("username", {
            required: "Username is required",
          })}
          placeholder='Username'
          fullWidth
          className={`${errors.username ? "mb-0" : "mb-4"}`}
          onChange={handleUsernameChange}
        />
        {errors.username && (
          <p className='mb-4 indent-0.5 font-bold text-red-500'>
            {errors.username.message}
          </p>
        )}
        <Input
          {...register("dob", {
            required: "Date of Birth is required",
            pattern: {
              value: /\d{2}\/\d{2}\/\d{4}/,
              message: "Use format MM/DD/YYYY",
            },
          })}
          placeholder='Date of Birth (MM/DD/YYYY)'
          fullWidth
          className={`${errors.dob ? "mb-0" : "mb-4"}`}
        />
        {errors.dob && (
          <p className='mb-4 indent-0.5 font-bold text-red-500'>
            {errors.dob.message}
          </p>
        )}
        <Input
          {...register("location", {
            required: "Location is required",
            pattern: {
              value: /\S+,\s*\S+/,
              message: "Use format - City, Country",
            },
          })}
          placeholder='Location (City, Country)'
          fullWidth
          className={`${errors.location ? "mb-0" : "mb-4"}`}
        />
        {errors.location && (
          <p className='mb-4 indent-0.5 font-bold text-red-500'>
            {errors.location.message}
          </p>
        )}

        <Button
          type='submit'
          disabled={!isValid}
          className={`mt-7 ${!isValid ? "cursor-not-allowed" : "hover:bg-slate-300 text-black"}`}
        >
          Next
        </Button>
      </form>
    </div>
  );
};

export default Form;
