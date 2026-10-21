const router = require("express").Router();
const home = require("../controllers/homeController");
const auth = require("../controllers/authController");
const listing = require("../controllers/listingController");
const application = require("../controllers/applicationController");
const tenant = require("../controllers/tenantController");
const landlord = require("../controllers/landlordController");
const feedback = require("../controllers/feedbackController");
const admin = require("../controllers/superAdminController");
const {
  requireAuth,
  requireApiAuth,
  requireApiTenant,
  requireTenant,
  requireLandlord,
  requireSuperAdmin,
} = require("../middleware/auth");
const upload = require("../middleware/upload");
const csrf = require("../middleware/csrf");
router.get("/", home.getHome);
router.get("/signup", auth.showSignup);
router.post("/signup", csrf.check, auth.signup);
router.get("/login", auth.showLogin);
router.post("/login", csrf.check, auth.login);
router.post("/logout", csrf.check, auth.logout);
router.get("/verify/:token", auth.verifyEmail);
router.get("/forgot-password", auth.showForgotPassword);
router.post("/forgot-password", csrf.check, auth.forgotPassword);
router.get("/reset-password/:token", auth.showResetPassword);
router.post("/reset-password/:token", csrf.check, auth.resetPassword);
router.get("/listings/:id", listing.details);
router.get("/photos/:id", listing.photo);
router.get("/tenant/dashboard", requireTenant, tenant.dashboard);
router.get("/tenant/applications", requireTenant, tenant.applications);
router.get("/listings/:id/apply", requireTenant, application.showApply);
router.post(
  "/listings/:id/apply",
  requireTenant,
  upload.documents,
  csrf.check,
  upload.validateFiles,
  application.apply,
);
router.get("/documents/:id", requireAuth, application.document);
router.get("/landlord/dashboard", requireLandlord, landlord.dashboard);
router.get("/landlord/listings/new", requireLandlord, listing.showCreate);
router.get("/landlord/listings/:id/edit", requireLandlord, listing.showEdit);
router.post(
  "/landlord/listings",
  requireLandlord,
  upload.photos,
  csrf.check,
  upload.validateFiles,
  listing.create,
);
router.post("/landlord/listings/:id", requireLandlord, csrf.check, listing.update);
router.get(
  "/landlord/listings/:id/applications",
  requireLandlord,
  application.review,
);
router.post(
  "/landlord/listings/:id/applications/:applicationId",
  requireLandlord,
  csrf.check,
  application.decide,
);
router.get("/tenant/feedback", requireTenant, feedback.tenantPage);
router.post("/tenant/feedback", requireTenant, csrf.check, feedback.submit);
router.get("/landlord/feedback", requireLandlord, feedback.landlordPage);
router.get("/superadmin/dashboard", requireSuperAdmin, admin.dashboard);
router.get("/superadmin/users", requireSuperAdmin, admin.users);
router.post("/superadmin/users/:id/active", requireSuperAdmin, csrf.check, admin.setUserActive);
router.post("/superadmin/users/:id/verify", requireSuperAdmin, csrf.check, admin.verifyUser);
router.post("/superadmin/users/:id/role", requireSuperAdmin, csrf.check, admin.changeRole);
router.get("/superadmin/properties", requireSuperAdmin, admin.properties);
router.post(
  "/superadmin/listings/:id/deactivate",
  requireSuperAdmin,
  csrf.check,
  admin.deactivate,
);
router.post("/superadmin/listings/:id/restore", requireSuperAdmin, csrf.check, admin.restore);
router.get("/superadmin/inquiries", requireSuperAdmin, admin.inquiries);
router.get("/superadmin/feedback", requireSuperAdmin, admin.feedback);
router.post("/superadmin/feedback/:id/delete", requireSuperAdmin, csrf.check, admin.deleteFeedback);
router.get("/api/listings", listing.apiList);
router.get("/api/listings/:id", listing.apiDetail);
router.get("/api/locations", listing.apiLocations);
router.get("/api/properties", listing.apiList);
router.get("/api/properties/:id", listing.apiDetail);
router.post("/api/inquiries", requireApiAuth, requireApiTenant, application.apiCreate);
module.exports = router;
