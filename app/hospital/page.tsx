
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Droplets,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  MapPin,
  Menu,
  Navigation,
  Network,
  Plus,
  RefreshCw,
  Search,
  Siren,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import { HospitalNavbar, HospitalFooter, HospitalChromeStyles } from "./components/HospitalChrome";

import "./hospital-dashboard.css";

import NotificationBell from "../../components/notifications/NotificationBell";

import {
  API_BASE_URL,
  authHeaders,
  clearAuth,
  getToken,
} from "../../lib/api";

/* =========================================================
   TYPES
========================================================= */

type Urgency =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

type Status =
  | "OPEN"
  | "DONOR_ACCEPTED"
  | "IN_PROGRESS"
  | "FULFILLED"
  | "CANCELLED";

type Request = {
  id: string;
  patientName?: string;
  bloodGroup: string;
  unitsRequired: number;
  hospitalName: string;
  city: string;
  urgency: Urgency;
  status: Status;
  createdAt?: string;
  contactName?: string;
  contactPhone?: string;
  location?: any;
  raw: any;
};

type DonorMatch = {
  id?: string;
  donor?: any;
  bloodGroup?: string;
  distance?: number;
  distanceKm?: number;
  matchScore?: number;
  compatibility?: string;
  explanation?: string;
  [key: string]: any;
};

/* =========================================================
   CONSTANTS
========================================================= */

const RAJASTHAN_CITY_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "bharatpur": { latitude: 27.2152, longitude: 77.5030 },
  "jaipur": { latitude: 26.9124, longitude: 75.7873 },
  "ajmer": { latitude: 26.4499, longitude: 74.6399 },
  "jodhpur": { latitude: 26.2389, longitude: 73.0243 },
  "udaipur": { latitude: 24.5854, longitude: 73.7125 },
  "kota": { latitude: 25.2138, longitude: 75.8648 },
  "bikaner": { latitude: 28.0229, longitude: 73.3119 },
  "alwar": { latitude: 27.5530, longitude: 76.6346 },
  "sikar": { latitude: 27.6094, longitude: 75.1399 },
};

async function resolveRajasthanCityCoordinates(city: string) {
  const cleanCity = city.trim();
  if (!cleanCity) throw new Error("Please enter the hospital city first.");

  const known = RAJASTHAN_CITY_COORDINATES[cleanCity.toLowerCase()];
  if (known) return known;

  const query = `${cleanCity}, Rajasthan, India`;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&addressdetails=1&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("Unable to locate the selected city.");

  const places = await response.json();
  if (!Array.isArray(places) || places.length === 0) {
    throw new Error(`Could not find "${cleanCity}, Rajasthan". Check the city name.`);
  }

  const needle = cleanCity.toLowerCase();
  const match = places.find((place: any) => {
    const address = place.address || {};
    const names = [
      address.city, address.town, address.village, address.municipality,
      address.county, address.state_district, place.name, place.display_name,
    ].filter(Boolean).join(" ").toLowerCase();
    return names.includes(needle);
  });
  if (!match) {
    throw new Error(`The location service did not confirm "${cleanCity}". Check the spelling.`);
  }

  const latitude = Number(match.lat);
  const longitude = Number(match.lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("The selected city returned invalid coordinates.");
  }
  return { latitude, longitude };
}

const urgencyRank: Record<Urgency, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/* =========================================================
   HELPERS
========================================================= */

const getId = (value: any) =>
  String(
    value?._id ||
      value?.id ||
      value ||
      ""
  );

const relativeTime = (date?: string) => {
  if (!date) return "Recently";

  const diff = Math.max(
    0,
    Date.now() - new Date(date).getTime()
  );

  const minutes = Math.floor(
    diff / 60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
};

/* =========================================================
   HOSPITAL DASHBOARD
========================================================= */

export default function HospitalDashboard() {
  const router = useRouter();

  /* =======================================================
     MAIN STATE
  ======================================================= */

  const [requests, setRequests] =
    useState<Request[]>([]);

  const [selected, setSelected] =
    useState<Request | null>(null);

  const [matches, setMatches] =
    useState<DonorMatch[]>([]);

  const [responses, setResponses] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [matchLoading, setMatchLoading] =
    useState(false);

  const [responseLoading, setResponseLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [createOpen, setCreateOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  /* =======================================================
     BLOOD BANK ASSIGNMENT
  ======================================================= */

  const [assignOpen, setAssignOpen] = useState(false);
  const [bloodBanks, setBloodBanks] = useState<any[]>([]);
  const [bloodBankLoading, setBloodBankLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedBloodBankId, setSelectedBloodBankId] = useState("");

  const [activeSection, setActiveSection] =
    useState("Dashboard");

  const [search, setSearch] =
    useState("");

  const [urgencyFilter, setUrgencyFilter] =
    useState<"ALL" | Urgency>("ALL");

  const [lastSynced, setLastSynced] =
    useState<Date | null>(null);

  /* =======================================================
     AUTH STATE
  ======================================================= */

  const [user, setUser] =
    useState<any>(null);

  const [authReady, setAuthReady] =
    useState(false);

  /* =======================================================
     SETTINGS
  ======================================================= */

  const [emergencyAlerts, setEmergencyAlerts] =
    useState(true);

  const [requestUpdates, setRequestUpdates] =
    useState(true);

  /* =======================================================
     FORM
  ======================================================= */

  const [form, setForm] =
    useState({
      patientName: "",
      bloodGroup: "O+",
      unitsRequired: "1",
      hospitalName: "",
      city: "",
      latitude: "",
      longitude: "",
      contactName: "",
      contactPhone: "",
      urgency: "HIGH" as Urgency,
    });

  const [locationSource, setLocationSource] =
    useState<"CITY" | "GPS" | "MANUAL" | "">("");

  /* =======================================================
     HOSPITAL NAME
  ======================================================= */

  const hospitalName =
    user?.name ||
    user?.hospitalName ||
    "Hospital Command Center";

  /* =======================================================
     AUTH RESTORE
  ======================================================= */

  useEffect(() => {
    try {
      const token = getToken();

      const storedUser =
        localStorage.getItem(
          "bloodlink_user"
        );

      if (!token || !storedUser) {
        clearAuth();
        router.replace("/login");
        return;
      }

      const parsedUser =
        JSON.parse(storedUser);

      let tokenRole = "";

      /*
       * JWT role read.
       * If decode fails, stored user role
       * will be used.
       */

      try {
        const tokenParts =
          token.split(".");

        if (tokenParts.length >= 2) {
          const payloadPart =
            tokenParts[1];

          const normalized =
            payloadPart
              .replace(/-/g, "+")
              .replace(/_/g, "/");

          const padded =
            normalized +
            "=".repeat(
              (4 -
                (normalized.length % 4)) %
                4
            );

          const payload =
            JSON.parse(
              atob(padded)
            );

          tokenRole = String(
            payload?.role || ""
          ).toUpperCase();
        }
      } catch {
        // Stored user role fallback.
      }

      const storedRole =
        String(
          parsedUser?.role || ""
        ).toUpperCase();

      const role =
        tokenRole || storedRole;

      /* ===============================
         ROLE ROUTING
      =============================== */

      if (role !== "HOSPITAL") {
        if (role === "DONOR") {
          router.replace("/donor");
        } else if (
          role === "BLOOD_BANK"
        ) {
          router.replace(
            "/blood-bank"
          );
        } else if (
          role === "ADMIN"
        ) {
          router.replace("/admin");
        } else {
          clearAuth();
          router.replace("/login");
        }

        return;
      }

      /*
       * Keep current hospital session
       * synchronized in localStorage.
       */

      const normalizedUser = {
        ...parsedUser,
        role: "HOSPITAL",
      };

      localStorage.setItem(
        "bloodlink_user",
        JSON.stringify(
          normalizedUser
        )
      );

      setUser(normalizedUser);
      setAuthReady(true);
    } catch (error) {
      console.error(
        "Unable to restore hospital session:",
        error
      );

      clearAuth();
      router.replace("/login");
    }
  }, [router]);

  /* =======================================================
     AUTH ERROR HANDLER

     401 = invalid/expired token
     403 = authenticated but forbidden

     IMPORTANT:
     NEVER logout on 403.
  ======================================================= */

  const logoutIfUnauthorized = (
    responseList: Response[]
  ) => {
    const unauthorized =
      responseList.some(
        (response) =>
          response.status === 401
      );

    if (unauthorized) {
      clearAuth();
      window.location.href =
        "/login";

      return true;
    }

    return false;
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    clearAuth();
    window.location.href =
      "/login";
  };

  /* =======================================================
     LOAD HOSPITAL REQUESTS
  ======================================================= */

  const loadRequests =
    useCallback(
      async (
        refresh = false
      ) => {
        if (!authReady || !user) {
          return;
        }

        const role = String(
          user?.role || ""
        ).toUpperCase();

        if (role !== "HOSPITAL") {
          return;
        }

        const token = getToken();

        if (!token) {
          clearAuth();
          router.replace(
            "/login"
          );
          return;
        }

        setError("");

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/blood-requests/my`,
              {
                headers:
                  authHeaders(),
                cache:
                  "no-store",
              }
            );

          if (
            logoutIfUnauthorized([
              response,
            ])
          ) {
            return;
          }

          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (!response.ok) {
            throw new Error(
              data?.message ||
                `Unable to load blood requests. (${response.status})`
            );
          }

          const currentUserId =
            getId(
              user?._id ||
                user?.id
            );

          const serverRequests =
            Array.isArray(
              data?.requests
            )
              ? data.requests
              : [];

          const own =
            serverRequests
              .filter(
                (request: any) => {
                  const creatorId =
                    getId(
                      request?.createdBy
                    );

                  return (
                    !currentUserId ||
                    !creatorId ||
                    creatorId ===
                      currentUserId
                  );
                }
              )
              .map(
                (
                  request: any
                ): Request => ({
                  id: getId(
                    request
                  ),

                  patientName:
                    request?.patientName,

                  bloodGroup:
                    request?.bloodGroup,

                  unitsRequired:
                    Number(
                      request?.unitsRequired ||
                        0
                    ),

                  hospitalName:
                    request?.hospitalName ||
                    "Hospital",

                  city:
                    request?.city ||
                    "Location unavailable",

                  urgency:
                    request?.urgency ||
                    "MEDIUM",

                  status:
                    request?.status ||
                    "OPEN",

                  createdAt:
                    request?.createdAt,

                  contactName:
                    request?.contactName,

                  contactPhone:
                    request?.contactPhone,

                  location:
                    request?.location,

                  raw: request,
                })
              )
              .sort(
                (a: Request, b: Request) =>
                  (
                    urgencyRank[a.urgency as Urgency] ?? 9
                  ) -
                    (
                      urgencyRank[b.urgency as Urgency] ?? 9
                    ) ||
                  new Date(
                    b.createdAt ||
                      0
                  ).getTime() -
                    new Date(
                      a.createdAt ||
                        0
                    ).getTime()
              );

          setRequests(own);
          setLastSynced(
            new Date()
          );
        } catch (error) {
          console.error(
            "Load hospital requests error:",
            error
          );

          setError(
            error instanceof Error
              ? error.message
              : "Unable to load blood requests."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        authReady,
        user,
        router,
      ]
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    if (!authReady || !user) {
      return;
    }

    loadRequests();
  }, [
    authReady,
    user,
    loadRequests,
  ]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredRequests =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          const matchesUrgency =
            urgencyFilter ===
              "ALL" ||
            request.urgency ===
              urgencyFilter;

          const matchesSearch =
            !q ||
            [
              request.bloodGroup,
              request.hospitalName,
              request.city,
              request.patientName,
              request.status,
            ].some((value) =>
              String(
                value || ""
              )
                .toLowerCase()
                .includes(q)
            );

          return (
            matchesUrgency &&
            matchesSearch
          );
        }
      );
    }, [
      requests,
      search,
      urgencyFilter,
    ]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats =
    useMemo(
      () => ({
        active:
          requests.filter(
            (request) =>
              ![
                "FULFILLED",
                "CANCELLED",
              ].includes(
                request.status
              )
          ).length,

        critical:
          requests.filter(
            (request) =>
              request.urgency ===
                "CRITICAL" &&
              ![
                "FULFILLED",
                "CANCELLED",
              ].includes(
                request.status
              )
          ).length,

        accepted:
          requests.filter(
            (request) =>
              request.status ===
              "DONOR_ACCEPTED"
          ).length,

        fulfilled:
          requests.filter(
            (request) =>
              request.status ===
              "FULFILLED"
          ).length,
      }),
      [requests]
    );

  /* =======================================================
     OPEN DETAILS
  ======================================================= */

  const openDetails =
    async (
      request: Request
    ) => {
      setSelected(request);
      setMatches([]);
      setResponses([]);

      setMatchLoading(true);
      setResponseLoading(true);

      try {
        const [
          matchRes,
          responseRes,
        ] =
          await Promise.all([
            fetch(
              `${API_BASE_URL}/api/blood-requests/${request.id}/matches`,
              {
                headers:
                  authHeaders(),
                cache:
                  "no-store",
              }
            ),

            fetch(
              `${API_BASE_URL}/api/blood-requests/${request.id}/responses`,
              {
                headers:
                  authHeaders(),
                cache:
                  "no-store",
              }
            ),
          ]);

        if (
          logoutIfUnauthorized([
            matchRes,
            responseRes,
          ])
        ) {
          return;
        }

        const matchData =
          await matchRes
            .json()
            .catch(
              () => ({})
            );

        const responseData =
          await responseRes
            .json()
            .catch(
              () => ({})
            );

        if (matchRes.ok) {
          setMatches(
            Array.isArray(
              matchData?.matchingDonors
            )
              ? matchData.matchingDonors
              : []
          );
        }

        if (responseRes.ok) {
          setResponses(
            Array.isArray(
              responseData?.responses
            )
              ? responseData.responses
              : []
          );
        }

        if (
          !matchRes.ok &&
          !responseRes.ok
        ) {
          throw new Error(
            matchData?.message ||
              responseData?.message ||
              "Unable to load request details."
          );
        }
      } catch (error) {
        setToast(
          error instanceof Error
            ? error.message
            : "Unable to load matching details."
        );

        window.setTimeout(
          () => setToast(""),
          3500
        );
      } finally {
        setMatchLoading(false);
        setResponseLoading(false);
      }
    };

  /* =======================================================
     CREATE REQUEST
  ======================================================= */

  const createRequest =
    async () => {
      setError("");

      if (
        !form.bloodGroup ||
        Number(form.unitsRequired) < 1 ||
        !form.hospitalName.trim() ||
        !form.city.trim() ||
        !form.contactName.trim() ||
        !form.contactPhone.trim()
      ) {
        setError(
          "Please complete all required fields including hospital city."
        );
        return;
      }

      const units = Number(form.unitsRequired);
      if (!Number.isInteger(units) || units < 1) {
        setError("Units required must be at least 1.");
        return;
      }

      const token = getToken();
      if (!token) {
        clearAuth();
        window.location.href = "/login";
        return;
      }

      setActionLoading(true);

      try {
        // Never reuse stale coordinates after city changes. City coordinates
        // are re-resolved on create unless the user explicitly selected MANUAL
        // and supplied a valid coordinate pair.
        let latitude = Number(form.latitude);
        let longitude = Number(form.longitude);

        const hasValidCoordinates =
          Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
          Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

        if (locationSource !== "MANUAL" || !hasValidCoordinates) {
          // Prefer explicitly captured hospital GPS from Profile when the city matches.
          // City-centre coordinates are only a fallback and are not precise hospital coordinates.
          let resolved: { latitude: number; longitude: number } | null = null;
          try {
            const savedProfile = JSON.parse(localStorage.getItem("bloodlink_hospital_profile") || "null");
            const profileCity = String(savedProfile?.city || "").trim().toLowerCase();
            const requestCity = form.city.trim().toLowerCase();
            const profileLat = Number(savedProfile?.latitude);
            const profileLon = Number(savedProfile?.longitude);
            if (profileCity && profileCity === requestCity &&
                Number.isFinite(profileLat) && profileLat >= -90 && profileLat <= 90 &&
                Number.isFinite(profileLon) && profileLon >= -180 && profileLon <= 180) {
              resolved = { latitude: profileLat, longitude: profileLon };
            }
          } catch { /* Ignore malformed local profile and fall back to city lookup. */ }
          if (!resolved) resolved = await resolveRajasthanCityCoordinates(form.city.trim());
          latitude = resolved.latitude;
          longitude = resolved.longitude;
          setForm((previous) => ({
            ...previous,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          }));
          setLocationSource("CITY");
        }

        const payload = {
          patientName: form.patientName.trim(),
          bloodGroup: form.bloodGroup,
          unitsRequired: units,
          hospitalName: form.hospitalName.trim(),
          city: form.city.trim(),
          location: { coordinates: { latitude, longitude } },
          contactName: form.contactName.trim(),
          contactPhone: form.contactPhone.trim(),
          urgency: form.urgency,
        };

        const response = await fetch(
          `${API_BASE_URL}/api/blood-requests`,
          {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
          }
        );

        if (logoutIfUnauthorized([response])) return;

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            data?.message || `Unable to create blood request. (${response.status})`
          );
        }

        setCreateOpen(false);
        setToast(data?.message || "Emergency blood request created successfully.");
        setForm((previous) => ({
          ...previous,
          patientName: "",
          unitsRequired: "1",
          urgency: "HIGH",
          latitude: "",
          longitude: "",
        }));
        setLocationSource("");
        await loadRequests(true);
        window.setTimeout(() => setToast(""), 3500);
      } catch (error) {
        console.error("Create blood request error:", error);
        setError(
          error instanceof Error ? error.message : "Unable to create blood request."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     UPDATE STATUS
  ======================================================= */

  const updateStatus =
    async (
      status: Status
    ) => {
      if (!selected) {
        return;
      }

      setActionLoading(true);

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/api/blood-requests/${selected.id}/status`,
            {
              method: "PATCH",

              headers:
                authHeaders({
                  "Content-Type":
                    "application/json",
                }),

              body:
                JSON.stringify({
                  status,
                }),
            }
          );

        if (
          logoutIfUnauthorized([
            response,
          ])
        ) {
          return;
        }

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Unable to update request status."
          );
        }

        setToast(
          `Request moved to ${status.replaceAll(
            "_",
            " "
          )}.`
        );

        setSelected(null);

        await loadRequests(
          true
        );

        window.setTimeout(
          () => setToast(""),
          3000
        );
      } catch (error) {
        setToast(
          error instanceof Error
            ? error.message
            : "Unable to update request."
        );

        window.setTimeout(
          () => setToast(""),
          3500
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     BLOOD BANK ASSIGNMENT
  ======================================================= */

  const loadBloodBanks = async () => {
    setBloodBankLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/blood-requests/blood-banks`,
        {
          method: "GET",
          headers: authHeaders(),
          cache: "no-store",
        }
      );

      console.log("Blood Bank API status:", response.status);

      if (logoutIfUnauthorized([response])) return;

      const data = await response.json().catch(() => ({}));

      console.log("Blood Bank API response:", data);

      if (!response.ok) {
        throw new Error(
          data?.message || `Unable to load Blood Banks (${response.status})`
        );
      }

      setBloodBanks(Array.isArray(data?.bloodBanks) ? data.bloodBanks : []);
    } catch (error) {
      console.error("Load Blood Banks error:", error);
      setToast(error instanceof Error ? error.message : "Unable to load Blood Banks.");
      window.setTimeout(() => setToast(""), 3500);
    } finally {
      setBloodBankLoading(false);
    }
  };

  const openAssignBloodBank = () => {
    console.log("ASSIGN BLOOD BANK CLICKED");

    if (!selected) {
      console.log("No selected request");
      return;
    }

    const existingBloodBank = selected.raw?.bloodBank;

    setSelectedBloodBankId(
      existingBloodBank?._id
        ? String(existingBloodBank._id)
        : existingBloodBank
          ? String(existingBloodBank)
          : ""
    );

    setAssignOpen(true);
    loadBloodBanks();
  };

  const assignBloodBank = async () => {
    if (!selected) return;

    if (!selectedBloodBankId) {
      setToast("Please select a Blood Bank first.");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }

    setAssignLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/blood-requests/${selected.id}/assign-blood-bank`,
        {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ bloodBankId: selectedBloodBankId }),
        }
      );

      console.log("Assign Blood Bank status:", response.status);

      if (logoutIfUnauthorized([response])) return;

      const data = await response.json().catch(() => ({}));

      console.log("Assign Blood Bank response:", data);

      if (!response.ok) {
        throw new Error(
          data?.message || `Unable to assign Blood Bank (${response.status})`
        );
      }

      const updatedRaw = data?.bloodRequest || {
        ...selected.raw,
        bloodBank: selectedBloodBankId,
      };

      setSelected({ ...selected, raw: updatedRaw });
      setAssignOpen(false);

      setToast(data?.message || "Blood Bank assigned successfully.");
      await loadRequests(true);
      window.setTimeout(() => setToast(""), 3500);
    } catch (error) {
      console.error("Assign Blood Bank error:", error);
      setToast(error instanceof Error ? error.message : "Unable to assign Blood Bank.");
      window.setTimeout(() => setToast(""), 3500);
    } finally {
      setAssignLoading(false);
    }
  };

  /* =======================================================
     LOCATION
  ======================================================= */

  const getLocation = async () => {
    const city = form.city.trim();
    if (!city) {
      setError("Pehle hospital city enter karo, jaise Bharatpur.");
      return;
    }

    setError("");
    setActionLoading(true);
    try {
      // City lookup is deterministic for common cities and validates geocoding
      // results for other cities. It never uses the device's current GPS.
      const { latitude, longitude } = await resolveRajasthanCityCoordinates(city);
      setForm((previous) => ({
        ...previous,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));
      setLocationSource("CITY");
      setToast(`${city} city-centre coordinates set. Check exact hospital location if needed.`);
      window.setTimeout(() => setToast(""), 3000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to locate the city."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const nav = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      target: "top",
    },

    {
      label: "My Requests",
      icon: Droplets,
      target: "requests",
    },

    {
      label: "New Request",
      icon: Plus,
      action: () => {
        setError("");
        setForm((previous) => ({
          ...previous,
          latitude: "",
          longitude: "",
        }));
        setLocationSource("");
        setCreateOpen(true);
      },
    },

    {
      label: "AI Donor Matches",
      icon: Sparkles,
      target: "network",
    },

    {
      label: "Network Intelligence",
      icon: Network,
      route: "/network",
    },

    {
      label: "Emergency Command Center",
      icon: Siren,
      route: "/emergency-command",
    },

    {
      label: "Responses",
      icon: Users,
      target: "responses",
    },

    // Future modules are registered now so the command-center
    // information architecture stays stable as pages are added.
    {
      label: "Blood Inventory",
      icon: Droplets,
      route: "/hospital/inventory",
    },

    {
      label: "Analytics",
      icon: Activity,
      route: "/hospital/analytics",
    },

    {
      label: "Notifications",
      icon: Bell,
      route: "/hospital/notifications",
    },
  ];

  const go = (
    item: (typeof nav)[number]
  ) => {
    if (item.action) {
      item.action();
    } else if (item.target) {
      document
        .getElementById(item.target)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    } else if ("route" in item && item.route) {
      router.push(item.route);
    }

    setActiveSection(
      item.label
    );

    setMobileMenu(false);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <HospitalChromeStyles />
      <HospitalNavbar />
    <main className="hospital-dashboard">

      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="grid-glow" />

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`hospital-sidebar ${
          mobileMenu
            ? "open"
            : ""
        }`}
      >

        <div className="sidebar-brand">

          <div className="brand-mark">
            <HeartPulse size={20} />
          </div>

          <div>
            <strong>
              BloodLink
              <span>AI</span>
            </strong>

            <small>
              HOSPITAL COMMAND
            </small>
          </div>

          <button
            className="mobile-close"
            onClick={() =>
              setMobileMenu(
                false
              )
            }
            aria-label="Close menu"
          >
            <X size={18} />
          </button>

        </div>

        {/* PROFILE */}

        <div className="hospital-profile">

          <div className="hospital-avatar">
            <Building2 size={22} />
          </div>

          <div>
            <strong>
              {hospitalName}
            </strong>

            <span>
              <i />
              Verified hospital
            </span>
          </div>

        </div>

        <div className="nav-label">
          OPERATIONS
        </div>

        <nav className="hospital-nav">

          {nav.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.label
                  }
                  className={
                    activeSection ===
                    item.label
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    go(item)
                  }
                >

                  <Icon
                    size={17}
                  />

                  <span>
                    {
                      item.label
                    }
                  </span>

                  {item.label ===
                    "My Requests" &&
                    requests.length >
                      0 && (
                      <b>
                        {
                          requests.length
                        }
                      </b>
                    )}

                </button>
              );
            }
          )}

        </nav>

        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <button
            className="settings-sidebar-button"
            onClick={() =>
              setSettingsOpen(
                true
              )
            }
          >
            <Settings
              size={16}
            />
            <span>
              Settings
            </span>
          </button>

          <div className="security-card">

            <ShieldCheck
              size={17}
            />

            <div>
              <strong>
                Protected network
              </strong>

              <span>
                Hospital data is secured.
              </span>
            </div>

          </div>

          <button
            className="visit-button"
            onClick={() =>
              (window.location.href =
                "/")
            }
          >
            <ArrowRight
              size={16}
            />

            Visit BloodLink AI
          </button>

          <button
            className="logout-button"
            onClick={
              handleLogout
            }
          >
            Logout
          </button>

        </div>

      </aside>

      {/* ===================================================
          MAIN
      =================================================== */}

      <section className="hospital-main">

        {/* TOPBAR */}

        <header className="topbar">

          <button
            className="menu-button"
            onClick={() =>
              setMobileMenu(
                true
              )
            }
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-breadcrumb">

            <span>
              HOSPITAL
            </span>

            <ChevronRight
              size={14}
            />

            <strong>
              Command Center
            </strong>

          </div>

          <div className="topbar-actions">

            <div className="network-live">
              <i />
              Network live
            </div>

            {/* REAL NOTIFICATION BELL */}

            <NotificationBell />

            <div className="top-user">

              <div className="mini-avatar">
                <Building2
                  size={15}
                />
              </div>

              <span>
                {hospitalName}
              </span>

              <ChevronDown
                size={14}
              />

            </div>

          </div>

        </header>

        {/* =================================================
            PAGE
        ================================================= */}

        <div
          className="page-content"
          id="top"
        >

          {/* HERO */}

          <section className="hero">

            <div className="hero-copy">

              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="eyebrow"
              >
                <Activity
                  size={13}
                />

                LIVE EMERGENCY
                COORDINATION
              </motion.div>

              <motion.h1
                initial={{
                  opacity: 0,
                  y: 18,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                Find blood.
                <br />

                <span>
                  Move faster.
                </span>
              </motion.h1>

              <motion.p
                initial={{
                  opacity: 0,
                  y: 14,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                A real-time command
                center for creating
                blood requests,
                discovering compatible
                donors and coordinating
                emergency responses.
              </motion.p>

              <div className="hero-actions">

                <button
                  className="primary-button"
                  onClick={() =>
                    setCreateOpen(
                      true
                    )
                  }
                >
                  <Plus size={17} />
                  Create emergency
                  request
                </button>

                <button
                  className="secondary-button"
                  onClick={() =>
                    document
                      .getElementById(
                        "network"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      })
                  }
                >
                  <Sparkles
                    size={16}
                  />

                  Explore AI matches
                </button>

              </div>

            </div>

            <div className="hero-visual">

              <motion.div
                className="orb orb-main"
                animate={{
                  y: [
                    0,
                    -12,
                    0,
                  ],
                  rotate: [
                    0,
                    3,
                    0,
                  ],
                }}
                transition={{
                  duration: 5,
                  repeat:
                    Infinity,
                  ease:
                    "easeInOut",
                }}
              >
                <HeartPulse
                  size={55}
                />
              </motion.div>

              <motion.div
                className="orbit orbit-one"
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 18,
                  repeat:
                    Infinity,
                  ease:
                    "linear",
                }}
              >
                <span />
              </motion.div>

              <motion.div
                className="orbit orbit-two"
                animate={{
                  rotate: -360,
                }}
                transition={{
                  duration: 26,
                  repeat:
                    Infinity,
                  ease:
                    "linear",
                }}
              >
                <span />
              </motion.div>

              <div className="floating-node node-one">
                <Droplets
                  size={15}
                />
                <span>
                  Blood network
                </span>
              </div>

              <div className="floating-node node-two">
                <Users
                  size={15}
                />
                <span>
                  AI matched
                </span>
              </div>

              <div className="floating-node node-three">
                <Zap size={15} />
                <span>
                  Emergency ready
                </span>
              </div>

            </div>

          </section>

          {/* STATS */}

          <section className="stats-grid">

            <Stat
              icon={
                <Activity
                  size={18}
                />
              }
              label="Active requests"
              value={stats.active}
              meta="Currently open"
            />

            <Stat
              icon={
                <TriangleAlert
                  size={18}
                />
              }
              label="Critical"
              value={
                stats.critical
              }
              meta="Immediate attention"
              critical
            />

            <Stat
              icon={
                <Sparkles
                  size={18}
                />
              }
              label="Donor accepted"
              value={
                stats.accepted
              }
              meta="Ready to coordinate"
            />

            <Stat
              icon={
                <CheckCircle2
                  size={18}
                />
              }
              label="Fulfilled"
              value={
                stats.fulfilled
              }
              meta="Completed requests"
            />

          </section>

          {/* ERROR */}

          {error && (
            <div className="error-banner">

              <TriangleAlert
                size={17}
              />

              <span>
                {error}
              </span>

              <button
                onClick={() =>
                  setError("")
                }
              >
                <X size={15} />
              </button>

            </div>
          )}

          {/* REQUESTS */}

          <section
            className="section-card"
            id="requests"
          >

            <div className="section-head">

              <div>

                <div className="section-eyebrow">
                  REQUEST CONTROL
                </div>

                <h2>
                  My blood requests
                </h2>

                <p>
                  Monitor every
                  request created by
                  your hospital and
                  open the live
                  matching workspace.
                </p>

              </div>

              <div className="head-actions">

                <button
                  className="refresh-button"
                  onClick={() =>
                    loadRequests(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                >
                  <RefreshCw
                    size={15}
                    className={
                      refreshing
                        ? "spin"
                        : ""
                    }
                  />

                  Refresh
                </button>

                <button
                  className="primary-small"
                  onClick={() =>
                    setCreateOpen(
                      true
                    )
                  }
                >
                  <Plus size={15} />
                  New request
                </button>

              </div>

            </div>

            {/* TOOLBAR */}

            <div className="toolbar">

              <div className="search-box">

                <Search
                  size={16}
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search blood group, city, patient..."
                />

              </div>

              <div className="filter-row">

                {(
                  [
                    "ALL",
                    "CRITICAL",
                    "HIGH",
                    "MEDIUM",
                    "LOW",
                  ] as const
                ).map(
                  (filter) => (
                    <button
                      key={
                        filter
                      }
                      className={
                        urgencyFilter ===
                        filter
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setUrgencyFilter(
                          filter
                        )
                      }
                    >
                      {filter ===
                      "ALL"
                        ? "All"
                        : filter}
                    </button>
                  )
                )}

              </div>

            </div>

            {/* REQUEST LIST */}

            {loading ? (
              <Loading />
            ) : filteredRequests.length ===
              0 ? (
              <Empty
                onCreate={() =>
                  setCreateOpen(
                    true
                  )
                }
              />
            ) : (
              <div className="request-table">

                {filteredRequests.map(
                  (
                    request,
                    index
                  ) => (
                    <motion.article
                      key={
                        request.id
                      }
                      className="request-row"
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index *
                          0.04,
                      }}
                    >

                      <div
                        className={`blood-chip ${request.urgency.toLowerCase()}`}
                      >
                        <Droplets
                          size={17}
                        />

                        <strong>
                          {
                            request.bloodGroup
                          }
                        </strong>
                      </div>

                      <div className="request-main">

                        <div className="request-title">

                          <strong>
                            {
                              request.hospitalName
                            }
                          </strong>

                          <UrgencyBadge
                            urgency={
                              request.urgency
                            }
                          />

                        </div>

                        <span>
                          <MapPin
                            size={12}
                          />

                          {
                            request.city
                          }
                        </span>

                        <small>
                          <Clock3
                            size={11}
                          />

                          {relativeTime(
                            request.createdAt
                          )}
                        </small>

                      </div>

                      <div className="request-metric">

                        <span>
                          Required
                        </span>

                        <strong>
                          {
                            request.unitsRequired
                          }{" "}
                          unit
                          {request.unitsRequired ===
                          1
                            ? ""
                            : "s"}
                        </strong>

                      </div>

                      <div className="status-pill">

                        <i />

                        {request.status.replaceAll(
                          "_",
                          " "
                        )}

                      </div>

                      <button
                        className="view-button"
                        onClick={() =>
                          openDetails(
                            request
                          )
                        }
                      >
                        Manage
                        <ChevronRight
                          size={15}
                        />
                      </button>

                    </motion.article>
                  )
                )}

              </div>
            )}

          </section>

          {/* NETWORK */}

          <section
            className="network-layout"
            id="network"
          >

            <div className="network-card">

              <div className="section-head compact">

                <div>

                  <div className="section-eyebrow">
                    AI DONOR NETWORK
                  </div>

                  <h2>
                    Live matching
                    intelligence
                  </h2>

                  <p>
                    Open a request to
                    see compatible donors
                    returned by the
                    BloodLink matching
                    engine.
                  </p>

                </div>

                <div className="ai-live">
                  <Sparkles
                    size={13}
                  />
                  AI LIVE
                </div>

              </div>

              <div className="network-stage">

                <div className="network-core">

                  <HeartPulse
                    size={30}
                  />

                  <span>
                    BloodLink
                    <br />
                    <b>AI</b>
                  </span>

                </div>

                {[
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                ].map(
                  (number) => (
                    <motion.div
                      key={
                        number
                      }
                      className={`network-dot dot-${number}`}
                      animate={{
                        scale: [
                          1,
                          1.16,
                          1,
                        ],
                        opacity: [
                          0.55,
                          1,
                          0.55,
                        ],
                      }}
                      transition={{
                        duration:
                          2 +
                          number *
                            0.25,
                        repeat:
                          Infinity,
                      }}
                    >
                      <Users
                        size={12}
                      />
                    </motion.div>
                  )
                )}

                <div className="stage-caption">

                  <strong>
                    Connected donor
                    network
                  </strong>

                  <span>
                    Compatibility ·
                    proximity ·
                    availability
                  </span>

                </div>

              </div>

            </div>

            {/* RESPONSE */}

            <div
              className="response-card"
              id="responses"
            >

              <div className="section-eyebrow">
                RESPONSE PIPELINE
              </div>

              <h2>
                Donor responses
              </h2>

              <p>
                Accepted responses are
                surfaced inside each
                request for fast
                coordination.
              </p>

              <div className="response-summary">

                <div>
                  <Users
                    size={18}
                  />

                  <strong>
                    {requests.reduce(
                      (
                        total,
                        request
                      ) =>
                        total +
                        Number(
                          request.raw
                            ?.donorResponses
                            ?.length ||
                            0
                        ),
                      0
                    )}
                  </strong>

                  <span>
                    Recorded responses
                  </span>
                </div>

                <div>
                  <CheckCircle2
                    size={18}
                  />

                  <strong>
                    {
                      stats.accepted
                    }
                  </strong>

                  <span>
                    Requests accepted
                  </span>
                </div>

              </div>

              <button
                className="outline-button"
                onClick={() =>
                  requests[0] &&
                  openDetails(
                    requests[0]
                  )
                }
              >
                Open response
                workspace

                <ArrowRight
                  size={15}
                />
              </button>

            </div>

          </section>

          {/* WORKFLOW */}

          <section className="workflow-strip">

            <div>
              <span>01</span>
              <strong>
                Create request
              </strong>
              <small>
                Capture blood group,
                urgency and hospital
                coordinates.
              </small>
            </div>

            <div>
              <span>02</span>
              <strong>
                AI finds donors
              </strong>
              <small>
                Compatibility and
                proximity are evaluated
                by the backend.
              </small>
            </div>

            <div>
              <span>03</span>
              <strong>
                Coordinate response
              </strong>
              <small>
                Review donor responses
                and move the request
                forward.
              </small>
            </div>

            <div>
              <span>04</span>
              <strong>
                Close the loop
              </strong>
              <small>
                Mark the request fulfilled
                when the case is complete.
              </small>
            </div>

          </section>

          {/* FOOTER */}

          <footer className="hospital-footer">

            <div className="footer-brand">

              <div className="brand-mark">
                <HeartPulse
                  size={19}
                />
              </div>

              <div>
                <strong>
                  BloodLink
                  <span>AI</span>
                </strong>

                <small>
                  INTELLIGENT BLOOD
                  NETWORK
                </small>
              </div>

            </div>

            <p>
              Emergency blood
              coordination designed
              around speed,
              compatibility and
              responsible human
              decisions.
            </p>

            <div className="footer-status">
              <i />

              Network operational ·{" "}
              {lastSynced
                ? `Synced ${lastSynced.toLocaleTimeString(
                    [],
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    }
                  )}`
                : "Live"}
            </div>

          </footer>

        </div>

      </section>

      {/* =====================================================
          SETTINGS MODAL
      ===================================================== */}

      <AnimatePresence>

        {settingsOpen && (
          <motion.div
            className="settings-backdrop"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={() =>
              setSettingsOpen(
                false
              )
            }
          >

            <motion.div
              className="hospital-settings-modal"
              initial={{
                opacity: 0,
                y: 24,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 16,
                scale: 0.985,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="settings-header">

                <div className="settings-header-main">

                  <div className="settings-icon">
                    <Settings
                      size={21}
                    />
                  </div>

                  <div>

                    <span className="settings-eyebrow">
                      ACCOUNT SETTINGS
                    </span>

                    <h2>
                      Hospital preferences
                    </h2>

                    <p>
                      Manage your BloodLink
                      AI hospital workspace
                      and notification
                      preferences.
                    </p>

                  </div>

                </div>

                <button
                  className="settings-close"
                  onClick={() =>
                    setSettingsOpen(
                      false
                    )
                  }
                  aria-label="Close settings"
                >
                  <X size={18} />
                </button>

              </div>

              {/* PROFILE */}

              <div className="settings-block">

                <span className="settings-section-label">
                  HOSPITAL PROFILE
                </span>

                <div className="settings-card">

                  <div className="settings-card-icon">
                    <Building2
                      size={19}
                    />
                  </div>

                  <div className="settings-card-content">

                    <strong>
                      {hospitalName}
                    </strong>

                    <span>
                      Hospital account
                    </span>

                  </div>

                  <div className="verified-pill">
                    <CheckCircle2
                      size={12}
                    />

                    Verified
                  </div>

                </div>

                <div className="settings-info-grid">

                  <div className="settings-info">

                    <span>
                      ACCOUNT EMAIL
                    </span>

                    <strong>
                      {user?.email ||
                        "Not available"}
                    </strong>

                  </div>

                  <div className="settings-info">

                    <span>
                      ACCOUNT TYPE
                    </span>

                    <strong>
                      Hospital
                    </strong>

                  </div>

                </div>

              </div>

              {/* NOTIFICATIONS */}

              <div className="settings-block">

                <span className="settings-section-label">
                  NOTIFICATION PREFERENCES
                </span>

                <div className="settings-list">

                  <div className="settings-row">

                    <div className="settings-row-icon emergency">
                      <TriangleAlert
                        size={18}
                      />
                    </div>

                    <div className="settings-row-content">

                      <strong>
                        Emergency alerts
                      </strong>

                      <span>
                        Receive important
                        blood request and
                        donor response
                        notifications.
                      </span>

                    </div>

                    <button
                      type="button"
                      className={`premium-toggle ${
                        emergencyAlerts
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setEmergencyAlerts(
                          (value) =>
                            !value
                        )
                      }
                      aria-pressed={
                        emergencyAlerts
                      }
                    >
                      <span />
                    </button>

                  </div>

                  <div className="settings-row">

                    <div className="settings-row-icon">
                      <Bell size={18} />
                    </div>

                    <div className="settings-row-content">

                      <strong>
                        Request updates
                      </strong>

                      <span>
                        Get notified when
                        your blood request
                        changes status.
                      </span>

                    </div>

                    <button
                      type="button"
                      className={`premium-toggle ${
                        requestUpdates
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setRequestUpdates(
                          (value) =>
                            !value
                        )
                      }
                      aria-pressed={
                        requestUpdates
                      }
                    >
                      <span />
                    </button>

                  </div>

                </div>

              </div>

              {/* SECURITY */}

              <div className="settings-block">

                <span className="settings-section-label">
                  SECURITY
                </span>

                <div className="security-settings-card">

                  <div className="security-settings-icon">
                    <ShieldCheck
                      size={19}
                    />
                  </div>

                  <div>
                    <strong>
                      Protected hospital
                      session
                    </strong>

                    <span>
                      This dashboard uses
                      authenticated
                      role-based access.
                    </span>
                  </div>

                  <div className="security-status">
                    Secure
                  </div>

                </div>

              </div>

              <div className="settings-footer">

                <div className="settings-protected">

                  <ShieldCheck
                    size={15}
                  />

                  <span>
                    BloodLink AI hospital
                    workspace
                  </span>

                </div>

                <button
                  className="settings-done"
                  onClick={() =>
                    setSettingsOpen(
                      false
                    )
                  }
                >
                  Done
                </button>

              </div>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* =====================================================
          CREATE REQUEST MODAL
      ===================================================== */}

      <AnimatePresence>

        {createOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={() =>
              !actionLoading &&
              setCreateOpen(
                false
              )
            }
          >

            <motion.div
              className="create-modal"
              initial={{
                opacity: 0,
                y: 25,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 20,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <button
                className="modal-close"
                onClick={() =>
                  !actionLoading &&
                  setCreateOpen(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

              <div className="modal-icon">
                <Droplets
                  size={22}
                />
              </div>

              <div className="section-eyebrow">
                NEW EMERGENCY REQUEST
              </div>

              <h2>
                Request blood support
              </h2>

              <p>
                Create a real hospital
                request. Location
                coordinates are required
                so nearby compatible
                donors can be matched.
              </p>

              {error && (
                <div className="error-banner">
                  <TriangleAlert
                    size={17}
                  />

                  <span>
                    {error}
                  </span>

                  <button
                    onClick={() =>
                      setError("")
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              <div className="form-grid">

                <Field
                  label="Patient name"
                  value={
                    form.patientName
                  }
                  onChange={(value) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        patientName:
                          value,
                      })
                    )
                  }
                />

                <Field
                  label="Hospital name *"
                  value={
                    form.hospitalName
                  }
                  onChange={(value) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        hospitalName:
                          value,
                      })
                    )
                  }
                />

                <SelectField
                  label="Blood group *"
                  value={
                    form.bloodGroup
                  }
                  onChange={(value) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        bloodGroup:
                          value,
                      })
                    )
                  }
                  options={[
                    "A+",
                    "A-",
                    "B+",
                    "B-",
                    "AB+",
                    "AB-",
                    "O+",
                    "O-",
                  ]}
                />

                <Field
                  label="Units required *"
                  type="number"
                  min="1"
                  value={
                    form.unitsRequired
                  }
                  onChange={(value) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        unitsRequired:
                          value,
                      })
                    )
                  }
                />

                <SelectField
                  label="Urgency *"
                  value={
                    form.urgency
                  }
                  onChange={(value) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        urgency:
                          value as Urgency,
                      })
                    )
                  }
                  options={[
                    "CRITICAL",
                    "HIGH",
                    "MEDIUM",
                    "LOW",
                  ]}
                />

                <Field
                  label="City *"
                  value={
                    form.city
                  }
                  onChange={(value) => {
                    setForm((previous) => ({
                      ...previous,
                      city: value,
                      latitude: "",
                      longitude: "",
                    }));
                    setLocationSource("");
                  }}
                />

                <Field
                  label="Contact name *"
                  value={
                    form.contactName
                  }
                  onChange={(value) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        contactName:
                          value,
                      })
                    )
                  }
                />

                <Field
                  label="Contact phone *"
                  value={
                    form.contactPhone
                  }
                  onChange={(value) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        contactPhone:
                          value,
                      })
                    )
                  }
                />

                <Field
                  label="Latitude *"
                  value={
                    form.latitude
                  }
                  onChange={(value) => {
                    setForm((previous) => ({
                      ...previous,
                      latitude: value,
                    }));
                    setLocationSource("MANUAL");
                  }}
                />

                <Field
                  label="Longitude *"
                  value={
                    form.longitude
                  }
                  onChange={(value) => {
                    setForm((previous) => ({
                      ...previous,
                      longitude: value,
                    }));
                    setLocationSource("MANUAL");
                  }}
                />

              </div>

              <button
                className="location-button"
                onClick={
                  getLocation
                }
                disabled={
                  actionLoading
                }
              >
                <Navigation
                  size={15}
                />

                Use selected city
                location
              </button>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "11px",
                  lineHeight: 1.5,
                  color: "rgba(90, 55, 67, .68)",
                }}
              >
                Location is based on the selected city. Browser GPS is not
                used automatically, so a Bharatpur request will not
                accidentally use Jaipur coordinates.
              </div>

              <div className="modal-actions">

                <button
                  className="secondary-button"
                  onClick={() =>
                    !actionLoading &&
                    setCreateOpen(
                      false
                    )
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    createRequest
                  }
                >
                  {actionLoading ? (
                    <>
                      <Loader2
                        size={16}
                        className="spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={16}
                      />
                      Create request
                    </>
                  )}
                </button>

              </div>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* =====================================================
          REQUEST DETAILS
      ===================================================== */}

      <AnimatePresence>

        {selected && (
          <motion.div
            className="modal-backdrop"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={() =>
              !actionLoading &&
              setSelected(null)
            }
          >

            <motion.div
              className="details-modal"
              initial={{
                opacity: 0,
                y: 25,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 20,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <button
                className="modal-close"
                onClick={() =>
                  !actionLoading &&
                  setSelected(null)
                }
              >
                <X size={18} />
              </button>

              <div className="details-head">

                <div
                  className={`blood-chip ${selected.urgency.toLowerCase()}`}
                >
                  <Droplets
                    size={19}
                  />

                  <strong>
                    {
                      selected.bloodGroup
                    }
                  </strong>
                </div>

                <div>

                  <div className="section-eyebrow">
                    REQUEST CONTROL
                  </div>

                  <h2>
                    {
                      selected.hospitalName
                    }
                  </h2>

                  <p>
                    {selected.city}
                    {" · "}
                    {
                      selected.unitsRequired
                    }{" "}
                    unit
                    {selected.unitsRequired ===
                    1
                      ? ""
                      : "s"}
                    {" · "}
                    {
                      selected.urgency
                    }
                  </p>

                </div>

              </div>

              <div className="detail-grid">

                <Detail
                  label="Status"
                  value={selected.status.replaceAll(
                    "_",
                    " "
                  )}
                />

                <Detail
                  label="Patient"
                  value={
                    selected.patientName ||
                    "Not provided"
                  }
                />

                <Detail
                  label="Contact"
                  value={
                    selected.contactName ||
                    "Not provided"
                  }
                />

                <Detail
                  label="Phone"
                  value={
                    selected.contactPhone ||
                    "Not provided"
                  }
                />

              </div>

              {/* MATCHES */}

              <div className="modal-section">

                <div className="modal-section-title">

                  <div>
                    <span>
                      AI MATCHES
                    </span>

                    <h3>
                      Compatible donors
                    </h3>
                  </div>

                  <b>
                    {matchLoading
                      ? "Scanning..."
                      : `${matches.length} found`}
                  </b>

                </div>

                {matchLoading ? (
                  <Loading small />
                ) : matches.length ===
                  0 ? (
                  <div className="empty-inline">
                    <Users
                      size={18}
                    />

                    No donor matches
                    returned yet.
                  </div>
                ) : (
                  <div className="match-list">

                    {matches
                      .slice(0, 8)
                      .map(
                        (
                          match,
                          index
                        ) => {
                          const donor =
                            match.donor ||
                            match;

                          const name =
                            donor
                              ?.user
                              ?.name ||
                            donor?.name ||
                            `Donor ${
                              index +
                              1
                            }`;

                          const bloodGroup =
                            donor?.bloodGroup ||
                            match.bloodGroup ||
                            "—";

                          const distance =
                            Number(
                              match.distanceKm ??
                                match.distance
                            );

                          return (
                            <div
                              className="match-row"
                              key={
                                match.id ||
                                getId(
                                  donor
                                ) ||
                                index
                              }
                            >

                              <div className="match-avatar">
                                <HeartPulse
                                  size={15}
                                />
                              </div>

                              <div>
                                <strong>
                                  {
                                    name
                                  }
                                </strong>

                                <span>
                                  {
                                    bloodGroup
                                  }
                                  {" · "}
                                  {Number.isFinite(
                                    distance
                                  )
                                    ? `${distance.toFixed(
                                        1
                                      )} km`
                                    : "Distance unavailable"}
                                </span>
                              </div>

                              <div className="match-score">
                                <Sparkles
                                  size={13}
                                />

                                {match.matchScore !=
                                null
                                  ? `${Math.round(
                                      match.matchScore
                                    )}%`
                                  : "Matched"}
                              </div>

                            </div>
                          );
                        }
                      )}

                  </div>
                )}

              </div>

              {/* RESPONSES */}

              <div className="modal-section">

                <div className="modal-section-title">

                  <div>
                    <span>
                      RESPONSES
                    </span>

                    <h3>
                      Donor responses
                    </h3>
                  </div>

                  <b>
                    {responseLoading
                      ? "Loading..."
                      : responses.length}
                  </b>

                </div>

                {responseLoading ? (
                  <Loading small />
                ) : responses.length ===
                  0 ? (
                  <div className="empty-inline">
                    <Clock3
                      size={18}
                    />

                    No responses recorded
                    for this request yet.
                  </div>
                ) : (
                  <div className="response-list">

                    {responses.map(
                      (
                        response,
                        index
                      ) => {

                        const donor =
                          response?.donor ||
                          {};

                        const donorUser =
                          donor?.user ||
                          {};

                        const accepted =
                          response?.status ===
                          "ACCEPTED";

                        return (
                          <div
                            className={`response-row ${
                              accepted
                                ? "response-row-accepted"
                                : ""
                            }`}
                            key={
                              getId(
                                donor
                              ) ||
                              index
                            }
                          >

                            <div
                              className={`response-dot ${
                                accepted
                                  ? "accepted"
                                  : "rejected"
                              }`}
                            />

                            <div>

                              <strong>
                                {donorUser?.name ||
                                  donor?.name ||
                                  "Donor"}
                              </strong>

                              <span>
                                {donor?.bloodGroup ||
                                  "—"}
                                {" · "}
                                {response?.status ||
                                  "PENDING"}
                              </span>

                              {accepted && (
                                <div className="accepted-donor-info">

                                  <span>
                                    📞{" "}
                                    {donorUser?.phone ||
                                      donor?.phone ||
                                      "Phone unavailable"}
                                  </span>

                                  <span>
                                    ✉️{" "}
                                    {donorUser?.email ||
                                      donor?.email ||
                                      "Email unavailable"}
                                  </span>

                                </div>
                              )}

                            </div>

                            <small>
                              {response?.respondedAt
                                ? new Date(
                                    response.respondedAt
                                  ).toLocaleTimeString(
                                    "en-IN",
                                    {
                                      hour:
                                        "2-digit",
                                      minute:
                                        "2-digit",
                                    }
                                  )
                                : "—"}
                            </small>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </div>

              {/* FULFILLMENT NETWORK */}

              <div style={{ marginTop: 22, marginBottom: 22, padding: 18, borderRadius: 18, border: "1px solid #f0dbe2", background: "linear-gradient(135deg, #fffafb 0%, #fff4f7 100%)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div>
                    <span style={{ display: "block", fontSize: 9, fontWeight: 800, letterSpacing: ".18em", color: "#bd1745", marginBottom: 5 }}>FULFILLMENT NETWORK</span>
                    <h3 style={{ margin: 0, fontSize: 20, color: "#2f2025" }}>Blood Bank</h3>
                  </div>
                  <ShieldCheck size={21} style={{ color: "#7d5a66" }} />
                </div>

                {selected.raw?.bloodBank ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: 14, borderRadius: 14, background: "rgba(255,255,255,.85)", border: "1px solid #efdce3" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "#fff0f4", color: "#c91849", flexShrink: 0 }}><Building2 size={17} /></div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 13, color: "#302127" }}>{selected.raw.bloodBank?.name || selected.raw.bloodBank?.email || "Blood Bank assigned"}</strong>
                        <span style={{ display: "block", marginTop: 3, fontSize: 10, color: "#9b7e88" }}>Assigned and ready for fulfillment</span>
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, borderRadius: 999, padding: "6px 10px", background: "#edf9f3", color: "#287a5a", fontSize: 8, fontWeight: 800, letterSpacing: ".1em" }}>ASSIGNED</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", padding: 14, borderRadius: 14, background: "rgba(255,255,255,.8)", border: "1px solid #f0dce2" }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 13, color: "#332229" }}>No Blood Bank assigned</strong>
                      <span style={{ display: "block", marginTop: 4, fontSize: 10, color: "#9b7d86" }}>Assign the Blood Bank before marking this request fulfilled.</span>
                    </div>
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openAssignBloodBank(); }} disabled={assignLoading || selected.status === "FULFILLED" || selected.status === "CANCELLED"} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, borderRadius: 999, padding: "11px 17px", background: "linear-gradient(135deg,#c81748,#e33a68)", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 25px rgba(200,23,72,.18)" }}>
                      <Building2 size={15} /> Assign Blood Bank
                    </button>
                  </div>
                )}
              </div>

              {/* STATUS */}

              <div className="status-actions">

                <span>
                  Move request
                </span>

                <div>

                  {selected.status ===
                    "DONOR_ACCEPTED" && (
                    <button
                      onClick={() =>
                        updateStatus(
                          "IN_PROGRESS"
                        )
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      {actionLoading
                        ? "Starting..."
                        : "Start coordination"}
                    </button>
                  )}

                  {selected.status ===
                    "IN_PROGRESS" && (
                    <button
                      onClick={() =>
                        updateStatus(
                          "FULFILLED"
                        )
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      {actionLoading
                        ? "Completing..."
                        : "Mark fulfilled"}
                    </button>
                  )}

                  {selected.status ===
                    "OPEN" && (
                    <button
                      className="danger-soft"
                      onClick={() =>
                        updateStatus(
                          "CANCELLED"
                        )
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      Cancel request
                    </button>
                  )}

                </div>

              </div>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* =====================================================
          ASSIGN BLOOD BANK MODAL
      ===================================================== */}

      <AnimatePresence>
        {assignOpen && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !assignLoading && setAssignOpen(false)}>
            <motion.div className="create-modal" initial={{ opacity: 0, y: 25, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} onClick={(event) => event.stopPropagation()} style={{ maxWidth: 560 }}>
              <button className="modal-close" type="button" onClick={() => !assignLoading && setAssignOpen(false)}><X size={18} /></button>
              <div className="modal-icon"><Building2 size={22} /></div>
              <div className="section-eyebrow">FULFILLMENT NETWORK</div>
              <h2>Assign Blood Bank</h2>
              <p>Select an active Blood Bank for this hospital request. The selected Blood Bank will receive the request in its dashboard.</p>

              {bloodBankLoading ? <Loading small /> : bloodBanks.length === 0 ? (
                <div className="empty-inline"><Building2 size={18} />No active Blood Bank accounts were returned.</div>
              ) : (
                <div style={{ display: "grid", gap: 10, maxHeight: 330, overflowY: "auto", marginTop: 18 }}>
                  {bloodBanks.map((bank) => {
                    const id = getId(bank);
                    const selectedBank = selectedBloodBankId === id;
                    return (
                      <button type="button" key={id} onClick={() => setSelectedBloodBankId(id)} disabled={assignLoading} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 14, textAlign: "left", borderRadius: 15, border: selectedBank ? "1.5px solid #cf1749" : "1px solid #efdce3", background: selectedBank ? "#fff1f5" : "#fff", cursor: "pointer" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: selectedBank ? "#cf1749" : "#fff0f4", color: selectedBank ? "#fff" : "#c81748", flexShrink: 0 }}><Building2 size={17} /></div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ display: "block", fontSize: 13, color: "#302127" }}>{bank?.name || "Blood Bank"}</strong>
                          <span style={{ display: "block", marginTop: 3, fontSize: 10, color: "#9a7d86", overflow: "hidden", textOverflow: "ellipsis" }}>{bank?.email || bank?.phone || "Verified Blood Bank"}</span>
                        </div>
                        {selectedBank && <CheckCircle2 size={20} style={{ color: "#cf1749" }} />}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button className="secondary-button" type="button" onClick={() => !assignLoading && setAssignOpen(false)} disabled={assignLoading}>Cancel</button>
                <button className="primary-button" type="button" onClick={assignBloodBank} disabled={assignLoading || bloodBankLoading || !selectedBloodBankId}>
                  {assignLoading ? <><Loader2 size={16} className="spin" />Assigning...</> : <><ShieldCheck size={16} />Confirm assignment</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <motion.div
          className="toast"
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >
          <CheckCircle2
            size={17}
          />

          {toast}
        </motion.div>
      )}

      {/* =====================================================
          SETTINGS CSS
      ===================================================== */}

      <style jsx global>{`

        .settings-sidebar-button {
          width: 100%;
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          margin-bottom: 9px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: transparent;
          color: #687383;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
        }

        .settings-sidebar-button:hover {
          background: #fff3f6;
          color: #c21e45;
          transform: translateX(2px);
        }

        .logout-button {
          width: 100%;
          min-height: 40px;
          margin-top: 8px;
          border: 1px solid rgba(194,30,69,.12);
          border-radius: 12px;
          background: rgba(194,30,69,.045);
          color: #bd2349;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all .2s ease;
        }

        .logout-button:hover {
          background: #fff0f4;
          border-color: rgba(194,30,69,.22);
          transform: translateY(-1px);
        }

        .settings-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 22px;
          background: rgba(38,17,25,.34);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .hospital-settings-modal {
          width: min(600px, 100%);
          max-height: calc(100vh - 44px);
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,.95);
          border-radius: 28px;
          background: linear-gradient(
            145deg,
            rgba(255,255,255,.99),
            rgba(255,249,251,.98)
          );
          box-shadow:
            0 40px 100px rgba(55,16,31,.22),
            0 10px 30px rgba(55,16,31,.08);
        }

        .hospital-settings-modal::-webkit-scrollbar {
          width: 5px;
        }

        .hospital-settings-modal::-webkit-scrollbar-thumb {
          background: #ead9de;
          border-radius: 99px;
        }

        .settings-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 28px 29px 24px;
          border-bottom: 1px solid #f0e4e7;
        }

        .settings-header-main {
          display: flex;
          gap: 14px;
        }

        .settings-icon {
          width: 47px;
          height: 47px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #c21e45;
          background: linear-gradient(
            135deg,
            #fff0f4,
            #ffe2ea
          );
        }

        .settings-eyebrow {
          display: block;
          margin-bottom: 5px;
          color: #c21e45;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .settings-header h2 {
          margin: 0;
          color: #302229;
          font-size: 23px;
          font-weight: 900;
        }

        .settings-header p {
          max-width: 410px;
          margin: 6px 0 0;
          color: #91848a;
          font-size: 11px;
          line-height: 1.6;
        }

        .settings-close {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border: 1px solid #eee2e5;
          border-radius: 11px;
          background: #fff;
          color: #8d7e84;
          cursor: pointer;
        }

        .settings-block {
          padding: 22px 29px 0;
        }

        .settings-section-label {
          display: block;
          margin-bottom: 10px;
          color: #a09399;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .settings-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 15px;
          border: 1px solid #f0dfe4;
          border-radius: 17px;
          background: #fffafb;
        }

        .settings-card-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #b91d43;
          background: #ffecef;
        }

        .settings-card-content {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .settings-card-content strong {
          color: #3a2c32;
          font-size: 13px;
          font-weight: 800;
        }

        .settings-card-content span {
          color: #96888e;
          font-size: 10px;
        }

        .verified-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 9px;
          border-radius: 999px;
          color: #14825f;
          background: #eaf8f3;
          font-size: 9px;
          font-weight: 800;
        }

        .settings-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }

        .settings-info {
          padding: 13px 14px;
          border: 1px solid #eee5e7;
          border-radius: 14px;
          background: #fff;
        }

        .settings-info span {
          display: block;
          margin-bottom: 5px;
          color: #a4969c;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .settings-info strong {
          color: #44373d;
          font-size: 11px;
          font-weight: 700;
          word-break: break-word;
        }

        .settings-list {
          overflow: hidden;
          border: 1px solid #eee3e6;
          border-radius: 17px;
          background: #fff;
        }

        .settings-row {
          min-height: 76px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px 15px;
        }

        .settings-row + .settings-row {
          border-top: 1px solid #f1e9eb;
        }

        .settings-row-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #bd2349;
          background: #fff0f4;
        }

        .settings-row-icon.emergency {
          color: #b77919;
          background: #fff7e9;
        }

        .settings-row-content {
          min-width: 0;
          flex: 1;
        }

        .settings-row-content strong {
          display: block;
          margin-bottom: 3px;
          color: #3d3035;
          font-size: 12px;
          font-weight: 800;
        }

        .settings-row-content span {
          display: block;
          max-width: 390px;
          color: #97898f;
          font-size: 10px;
          line-height: 1.45;
        }

        .premium-toggle {
          width: 46px;
          height: 26px;
          flex-shrink: 0;
          padding: 3px;
          border: 0;
          border-radius: 99px;
          background: #d8d1d4;
          cursor: pointer;
        }

        .premium-toggle span {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 2px 7px rgba(0,0,0,.15);
          transition: transform .2s ease;
        }

        .premium-toggle.active {
          background: #159b72;
        }

        .premium-toggle.active span {
          transform: translateX(20px);
        }

        .security-settings-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid #e7eee9;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            #f8fcfa,
            #f5faf7
          );
        }

        .security-settings-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #19815f;
          background: #e6f6ef;
        }

        .security-settings-card > div:nth-child(2) {
          flex: 1;
        }

        .security-settings-card strong {
          display: block;
          margin-bottom: 3px;
          color: #3d4a43;
          font-size: 11px;
          font-weight: 800;
        }

        .security-settings-card span {
          display: block;
          color: #89958f;
          font-size: 9px;
          line-height: 1.5;
        }

        .security-status {
          padding: 5px 9px;
          border-radius: 999px;
          color: #18835f;
          background: #e4f6ef;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .settings-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 23px;
          padding: 19px 29px 25px;
          border-top: 1px solid #f0e4e7;
        }

        .settings-protected {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #9b8d92;
          font-size: 9px;
        }

        .settings-protected svg {
          color: #4c9279;
        }

        .settings-done {
          min-width: 85px;
          padding: 10px 18px;
          border: 0;
          border-radius: 11px;
          color: #fff;
          background: #b91c3c;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 600px) {

          .settings-backdrop {
            padding: 12px;
          }

          .hospital-settings-modal {
            max-height: calc(100vh - 24px);
            border-radius: 22px;
          }

          .settings-header {
            padding: 21px 19px;
          }

          .settings-block {
            padding-left: 19px;
            padding-right: 19px;
          }

          .settings-footer {
            padding-left: 19px;
            padding-right: 19px;
          }

          .settings-info-grid {
            grid-template-columns: 1fr;
          }

          .verified-pill {
            display: none;
          }

          .settings-row-content span {
            max-width: 230px;
          }

        }

      `}</style>

    </main>
      <HospitalFooter />
    </>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  icon,
  label,
  value,
  meta,
  critical = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  meta: string;
  critical?: boolean;
}) {
  return (
    <motion.div
      className={`stat-card ${
        critical
          ? "critical"
          : ""
      }`}
      whileHover={{
        y: -4,
      }}
    >
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {meta}
        </small>
      </div>
    </motion.div>
  );
}

/* =========================================================
   URGENCY
========================================================= */

function UrgencyBadge({
  urgency,
}: {
  urgency: Urgency;
}) {
  return (
    <span
      className={`urgency-badge ${urgency.toLowerCase()}`}
    >
      <i />
      {urgency}
    </span>
  );
}

/* =========================================================
   LOADING
========================================================= */

function Loading({
  small = false,
}: {
  small?: boolean;
}) {
  return (
    <div
      className={`loading-state ${
        small ? "small" : ""
      }`}
    >
      <Loader2
        className="spin"
        size={
          small
            ? 18
            : 25
        }
      />

      <span>
        Loading live network data...
      </span>
    </div>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function Empty({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <div className="empty-state">

      <div className="empty-icon">
        <Droplets
          size={25}
        />
      </div>

      <h3>
        No blood requests yet
      </h3>

      <p>
        Create your first emergency
        request to activate the donor
        matching network.
      </p>

      <button
        className="primary-small"
        onClick={onCreate}
      >
        <Plus size={15} />
        Create request
      </button>

    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  min?: string;
}) {
  return (
    <label className="field">

      <span>
        {label}
      </span>

      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />

    </label>
  );
}

/* =========================================================
   SELECT
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  options: string[];
}) {
  return (
    <label className="field">

      <span>
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}
      </select>

    </label>
  );
}

/* =========================================================
   DETAIL
========================================================= */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="detail">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}