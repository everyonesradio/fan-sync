// ** React/Next.js Imports
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";

// ** React95 Imports
import { Button } from "@react95/core";

// ** Custom Components, Hooks, Utils, etc.
import { type FormDataType, useFormContext } from "@/context/FormDataContext";

// ** Icon Imports
import { HiUser } from "react-icons/hi2";

/**
 * The `Upload` component is responsible for handling the client-side image upload process.
 * It takes a `FileList` or `null` as input and performs the following steps:
 * 1. Checks if a file has been selected by the user.
 * 2. Creates a `FormData` object and appends the selected file to it.
 * 3. Sets the `FormData` object in the `FormDataContext` for further processing.
 * 4. Generates a temporary URL for the selected file and updates the `imageURL` state to display the image preview.
 * 5. If no file is selected, it alerts the user to select a file.
 * 6. Handles any errors that may occur during the upload process and logs them to the console.
 *
 * @param files - The selected files to be uploaded, or `null` if no files are selected.
 */

export const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(",");
  const mimeMatch = /:(.*?);/.exec(arr[0]);
  if (!mimeMatch) throw new Error("Invalid data URL");

  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new File([u8arr], filename, { type: mime });
};

const Upload = () => {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const router = useRouter();
  const { formData, setFormData } = useFormContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface StoredFormData {
    data: Partial<FormDataType>;
    savedAt: number;
  }

  // ✅ Recover base64 + reconstruct File after refresh
  useEffect(() => {
    const stored = localStorage.getItem("formData");

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredFormData;

        const expired = Date.now() - parsed.savedAt > 20 * 60 * 1000; // 20 minutes

        if (!expired && parsed.data) {
          const parsedData: Partial<FormDataType> = parsed.data;

          if (parsedData.fileURL) {
            const file = dataURLtoFile(parsedData.fileURL, "recovered.png");

            setFormData({
              ...parsedData,
              files: [file], // ✅ reconstruct File[]
            } as FormDataType);

            setImageURL(parsedData.fileURL);
          }
        } else {
          localStorage.removeItem("formData");
        }
      } catch (err) {
        console.error("Failed to restore formData from localStorage:", err);
        localStorage.removeItem("formData");
      }
    }
  }, []);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      alert("Please select a file to upload");
      return;
    }

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64 = reader.result as string;

      setImageURL(base64);
      const newFormData = {
        ...formData,
        fileURL: base64,
        files: [file],
      };

      setFormData(newFormData);

      // ✅ Save to localStorage with timestamp
      localStorage.setItem(
        "formData",
        JSON.stringify({
          data: { ...newFormData, files: undefined }, // exclude raw File
          savedAt: Date.now(),
        })
      );
    };

    reader.readAsDataURL(file);
  };

  const handleDivClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className='flex min-h-screen bg-black flex-col items-center justify-evenly p-4 sm:p-24'>
      <div className='container mt-5'>
        <h1 className='font-bold text-5xl text-center p-8 text-white'>
          Upload Your Photo
        </h1>
        <div className='col-lg-8 offset-lg-2'>
          <button
            className='photo-bg flex justify-center items-center w-50 h-50 bg-white rounded-full'
            onClick={handleDivClick}
          >
            {imageURL ? (
              <Image
                src={imageURL}
                alt='Uploaded Image'
                height={250}
                width={250}
                className='rounded-full aspect-square object-cover'
              />
            ) : (
              <HiUser size={200} />
            )}
          </button>

          <input
            type='file'
            ref={fileInputRef}
            style={{ display: "none" }}
            accept='image/*'
            onChange={(e) => upload(e.target.files)}
          />
        </div>
      </div>

      <Button
        className={`${!imageURL ? "" : "hover:bg-slate-300 w-52"} `}
        onClick={() => router.push("/form")}
        disabled={!imageURL}
        style={{ color: !imageURL ? "lightgray" : "black" }}
      >
        Next
      </Button>
    </div>
  );
};

export default Upload;
