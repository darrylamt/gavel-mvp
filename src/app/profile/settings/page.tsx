"use client";


import Toggle from "@/components/ui/toggle";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ProfileSettingsPage() {

  const [browserNotifications, setBrowserNotifications] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("browserNotifications") === "true";
    }
    return false;
  });
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [smsNotifications, setSmsNotifications] = useState<boolean>(false);
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(false);
  const [privacyPublicProfile, setPrivacyPublicProfile] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("browserNotifications", browserNotifications ? "true" : "false");
    }
  }, [browserNotifications]);

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        {/* Notification Preferences */}
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-lg mb-2">Notifications</h2>
          <Toggle
            checked={browserNotifications}
            onChange={setBrowserNotifications}
            label="Allow browser notifications (pop-up alerts)"
          />
          {browserNotifications && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
            <p className="text-xs text-red-600">Notifications are blocked in your browser settings.</p>
          )}
          <Toggle
            checked={emailNotifications}
            onChange={setEmailNotifications}
            label="Receive email notifications"
          />
          <Toggle
            checked={smsNotifications}
            onChange={setSmsNotifications}
            label="Receive SMS notifications"
          />
        </div>

        {/* Marketing Preferences */}
        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-lg mb-2">Marketing</h2>
          <Toggle
            checked={marketingOptIn}
            onChange={setMarketingOptIn}
            label="Receive marketing offers and updates"
          />
        </div>

        {/* Privacy Settings */}
        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-lg mb-2">Privacy</h2>
          <Toggle
            checked={privacyPublicProfile}
            onChange={setPrivacyPublicProfile}
            label="Allow my profile to be publicly visible"
          />
        </div>

        {/* Account Management */}
        <div className="space-y-2 rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-lg mb-4">Account</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-800">Change Password</span>
              <button
                className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                onClick={() => router.push('/profile/change-password')}
              >
                Change
              </button>
            </div>
            {/* <div className="flex items-center justify-between">
              <span className="text-sm text-gray-800">Change Email</span>
              <button
                className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                onClick={() => router.push('/profile/change-email')}
              >
                Change
              </button>
            </div> */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-800">Delete Account</span>
              <button
                className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    // TODO: Implement account deletion logic
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
