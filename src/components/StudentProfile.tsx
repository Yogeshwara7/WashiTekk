import React from 'react';
import { Lock, Mail } from 'lucide-react';

interface ProfileField {
  name: string;
  value: string;
  editable: boolean;
  helpText: string;
}

const StudentProfile = () => {
  const profileFields: ProfileField[] = [
    {
      name: "First Name",
      value: "",
      editable: false,
      helpText: "Contact Master Admin (Brijesh, Ram) via registered email for changes"
    },
    {
      name: "Last Name",
      value: "",
      editable: false,
      helpText: "Contact Master Admin (Brijesh, Ram) via registered email for changes"
    },
    {
      name: "Gender",
      value: "",
      editable: false,
      helpText: "Contact Master Admin (Brijesh, Ram) via registered email for changes"
    },
    {
      name: "Year",
      value: "",
      editable: true,
      helpText: "This field can be updated by user"
    },
    {
      name: "College",
      value: "",
      editable: false,
      helpText: "Contact Master Admin (Brijesh, Ram) via registered email for changes"
    },
    {
      name: "Branch",
      value: "",
      editable: true,
      helpText: "This field can be updated by user"
    },
    {
      name: "Mobile Number",
      value: "",
      editable: false,
      helpText: "Contact Master Admin (Brijesh, Ram) via registered email for changes"
    },
    {
      name: "Email",
      value: "",
      editable: false,
      helpText: "Contact Master Admin (Brijesh, Ram) via registered email for changes"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">Student Profile</h2>
        
        <div className="space-y-6">
          {profileFields.map((field, index) => (
            <div key={index} className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  {field.name}
                </label>
                {!field.editable && (
                  <div className="flex items-center text-gray-500">
                    <Lock className="w-4 h-4 mr-1" />
                    <span className="text-xs">Locked</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full p-2 border rounded-md ${
                    !field.editable 
                      ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                      : 'bg-white'
                  }`}
                  disabled={!field.editable}
                  placeholder={field.name}
                />
                {!field.editable && (
                  <div className="mt-1 flex items-center text-sm text-blue-600">
                    <Mail className="w-4 h-4 mr-1" />
                    <span>
                      {field.helpText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 p-4 rounded-md">
          <h3 className="font-semibold text-blue-800 mb-2">Note:</h3>
          <p className="text-blue-600 text-sm">
            For security reasons, most profile fields can only be modified by the Master Admin.
            Please use your registered email to request any changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile; 