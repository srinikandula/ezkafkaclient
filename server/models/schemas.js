var mongoose = require('mongoose');
var config = require('./../config/config');
var ObjectId = mongoose.Schema.Types.ObjectId;

mongoose.connect(config.mongo.url, {
    user: config.mongo.user,
    pass: config.mongo.password,
    server: {socketOptions: {keepAlive: 1, connectTimeoutMS: 30000}},
    replset: {socketOptions: {keepAlive: 1, connectTimeoutMS: 30000}}
});

var connection = mongoose.connection;

connection.once('open', function () {
    console.log('CONNECTED TO MONGODB')
});

connection.on('error', function (err) {
    console.log('ERROR CONNECTING TO MONGODB', err);
});

var accountSchema = new mongoose.Schema({
    userName: { // name of the account is called accountId
        type: String,
        index: true,
        // unique: true
    },
    contactPhone: Number,
    password: String,
    email: String,
    type: {type: String, default: "account"},
    accountId: {type: ObjectId, ref: 'accounts'},
    id_admin: Number,
    id_franchise: Number,
    id_admin_role: Number,
    adminRoleId: {type: ObjectId, ref: 'adminRoles'},
    franchiseId: {type: ObjectId, ref: 'franchise'},
    groupName: String,
    firstName: String,
    lastName: String,
    contactName: String,
    displayName: String,
    contactAddress: String,
    city: String,
    state: String,
    location: String,
    truckIds: [],
    profilePic: String,
    updatedBy: String,
    createdBy: String,
    smsEnabled: {type: Boolean, default: true},
    isActive: {type: Boolean, default: true},
    gpsEnabled: {type: Boolean, default: false},
    erpEnabled: {type: Boolean, default: false},
    loadEnabled: {type: Boolean, default: true},
    editAccounts: {type: Boolean, default: false},
    lastLogin: Date,
    alternatePhone:String,
    companyName: String,
    pincode: String,
}, {
    timestamps: true
});

var operatingRoutesSchema = new mongoose.Schema({
    accountId: {type: ObjectId,ref: 'accounts'},
    id_account: String,
    source: String,
    sourceState: String,
    sourceAddress: String,
    sourceLocation: {
        'type': {type: String,default: "Point"},
        coordinates: [Number] //[longitude(varies b/w -180 and 180 W/E), latitude(varies b/w -90 and 90 N/S)]
    },
    destination: String,
    destinationState: String,
    destinationAddress: String,
    destinationLocation: {
        'type': {type: String,default: "Point"},
        coordinates: [Number] //[longitude(varies b/w -180 and 180 W/E), latitude(varies b/w -90 and 90 N/S)]
    },
    createdBy: {type: ObjectId, ref: 'accounts'},
    updatedBy: {type: ObjectId, ref: 'accounts'}
}, {timestamps: true});

var groupSchema = new mongoose.Schema({
    name: String,
    type: {type: Boolean, default: "account"},
    accountId: {
        type: ObjectId,
        ref: 'accounts'
    },
    userName: {
        type: String,
        index: true,
        unique: true
    },

    updatedBy: String,
    createdBy: String,
    isActive: {type: Boolean, default: true},
    attrs: {}
}, {
    timestamps: true
});

var truckSchema = new mongoose.Schema({
    userName: String,
    registrationNo: String,
    truckType: String,
    modelAndYear: String,
    tonnage: String,
    fitnessExpiry: Date,
    permitExpiry: Date,
    insuranceExpiry: Date,
    tracking_available: Number,
    accountId: {type: ObjectId, ref: 'accounts'},
    driverId: String,
    pollutionExpiry: Date,
    taxDueDate: Date,
    updatedBy: String,
    createdBy: String,
    status: Number,
    attrs: {latestLocation: {}},
    // latestLocation:{type:ObjectId,ref:'devicePositions'},
    deviceId: String,
    lookingForLoad: { type: Boolean, default: false },
    isIdle:Boolean,
    isStopped:Boolean
}, { timestamps: true });

var tripSchema = new mongoose.Schema({
    date: Date,
    registrationNo: String, //this will be truck id
    partyId: {type: ObjectId, ref: 'parties'},
    freightAmount: Number, //5000
    tonnage: Number, //new
    rate: Number, //new
    tripId: String,
    remarks: String, //new
    tripLane: String,
    tripExpenses: Number,
    driverId: {type: ObjectId, ref: 'drivers'},
    accountId: {type: ObjectId, ref: 'accounts'},
    groupId: {type: ObjectId, ref: 'groups'},
    updatedBy: String,
    createdBy: String,
    paymentHistory: [],
    attrs: {},
    share: {type: Boolean, default: false}
}, {timestamps: true});

var partySchema = new mongoose.Schema({
    name: String,
    contact: Number,
    email: String,
    city: String,
    accountId: {type: ObjectId, ref: 'accounts'},
    groupId: String,
    tripLanes: [],
    updatedBy: String,
    createdBy: String,
    attrs: {},
    partyType: String,
    isEmail: {type: Boolean, default: false},
    isSms: {type: Boolean, default: false}
}, {timestamps: true});


var eventDataSchema = new mongoose.Schema({
    transportername: String,
    vehicle_number: String,
    latitude: Number,
    longitude: Number,
    speed: Number,
    distance: Number,
    datetime: Number,
    attrs: {}
}, {timestamps: true});

var driverSchema = new mongoose.Schema({
    fullName: {type: String, trim: true},
    truckId: {type: ObjectId, ref: 'trucks'},
    accountId: {type: ObjectId, ref: 'accounts'},
    groupId: {type: ObjectId, ref: 'groups'},
    mobile: Number,
    licenseNumber: String,
    licenseValidity: Date,
    salary: Number,
    createdBy: String,
    updatedBy: String,
    driverId: String,
    isActive: {type: Boolean, default: true},
    attrs: {}
}, {
    timestamps: true
});
var expensesSchema = new mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    vehicleNumber: {type: ObjectId, ref: 'trucks'},
    expenseType: {type: ObjectId, ref: 'expenseMaster'},
    partyId: {type: ObjectId, ref: 'parties'},
    description: String,
    date: Date,
    totalAmount: {type: Number, default: 0},
    paidAmount: {type: Number, default: 0},
    cost: {type: Number, default: 0},
    mode: String,
    updatedBy: String,
    createdBy: String,
    isDefault: {type: Boolean, default: false},
    attrs: {}
}, {timestamps: true});

var rolesSchema = new mongoose.Schema({
    roleName: String,
    updatedBy: String,
    createdBy: String,
    menus: [],
    attrs: {}
}, {timestamps: true});

var expenseMaster = new mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    expenseName: String,
    updatedBy: String,
    createdBy: String,
    attrs: {}
}, {timestamps: String});

var payments = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    partyId: {type: ObjectId, ref: 'parties'},
    description: String,
    amount: Number,
    updatedBy: String,
    createdBy: String,
    date: Date,
    paymentType: String,
    paymentRefNo: String,
    attrs: {}
}, {timestamps: String});

var otpSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    otp: Number,
    expaireIn: Number,
    contactPhone: Number
}, {timestamps: String});

var notificationsSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    notificationType: Number, // 0 -SMS, 1-EMAIL, 2-BOTH
    content: String,
    status: {type: Boolean, default: false},
    tripId: {type: ObjectId, ref: 'trips'},
    message: String
}, {timestamps: String});

var erpSettingsSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    revenue: {
        filterType: {type: String, default: "month"},
        fromDate: {type: Date},
        toDate: {type: Date}
    },
    payment: {
        filterType: {type: String, default: "month"},
        fromDate: {type: Date},
        toDate: {type: Date}
    },
    expense: {
        filterType: {type: String, default: "month"},
        fromDate: {type: Date},
        toDate: {type: Date}
    },
    expiry: {
        filterType: {type: String, default: "month"},
        fromDate: {type: Date},
        toDate: {type: Date}
    },
    tollCard: {
        filterType: {type: String, default: "month"},
        fromDate: {type: Date},
        toDate: {type: Date}
    },
    fuelCard: {
        filterType: {type: String, default: "month"},
        fromDate: {type: Date},
        toDate: {type: Date}
    }
}, {timestamps: String});

var devicePositions = new mongoose.Schema({
    gprmc: String,
    name: String,
    uniqueId: String,
    deviceId: String,
    protocol: String,
    deviceTime: Number,
    fixTime: Number,
    valid: Boolean,
    location: {
        type: {
            type: String,
            default: "Point"
        },
        coordinates: [Number] //[longitude(varies b/w -180 and 180 W/E), latitude(varies b/w -90 and 90 N/S)]
    },
    altitude: String,
    speed: String,
    course: String,
    statusCode: String,
    attributes: {},
    address: String,
    isIdle:Boolean,
    isStopped:Boolean,
    distance:{type:Number,default:0},
    totalDistance:{type:Number,default:0}
        // isViewed : Boolean
}, { timestamps: true, versionKey: false });

var archivedDevicePositions = new mongoose.Schema({
    // _id: ObjectId,
    // updatedAt: Date,
    // createdAt: Date,
    gprmc: String,
    name: String,
    uniqueId: String,
    deviceId: String,
    protocol: String,
    deviceTime: Number,
    fixTime: Number,
    valid: Boolean,
    location: {
        type: {
            type: String,
            default: "Point"
        },
        coordinates: [Number] //[longitude(varies b/w -180 and 180 W/E), latitude(varies b/w -90 and 90 N/S)]
    },
    altitude: String,
    speed: String,
    course: String,
    statusCode: String,
    attributes: {
        batteryLevel: String,
        distance: Number,
        totalDistance: Number,
        motion: Number
    },
    address: String
    // isViewed : Boolean
}, {timestamps: true, versionKey: false});

var deviceSchema = new mongoose.Schema({
    userName: String,
    createdBy: {type: ObjectId, ref: 'accounts'},
    deviceId: String,
    assignedTo: String,//{type: ObjectId, ref: 'accounts'},
    //truckId: {type: ObjectId, ref: 'trucks'},
    simNumber: String,
    imei: String,
    simPhoneNumber: String,
    truckId: {type: ObjectId, ref: 'trucks'},
    address: String,
    installedBy: String,  //installed UserId
    accountId: {type: ObjectId, ref: 'accounts'},
    devicePaymentStatus: String,
    devicePaymentPlan: String, //reference to device payment plan
    lastStopTime: Date,
    fuelCapacity: Number,
    installTime: Date,
    resetTime: Date,
    paymentStart: Date,
    paymentEnd: Date,
    isDamaged: {type: Boolean, default: '0'}, //duplicate to status?
    replacedFor: String, //if this is replacement to another device
    equipmentType: String,
    serialNumber: String,
    isActive: {type: Boolean, default: true},
    remarks: String,
    attrs: {latestLocation: {}}
}, {timestamps: true, versionKey: false});

var secretKeys = new mongoose.Schema({
    secret: {
        type: String
    },
    email: String
}, {timestamps: true, versionKey: false});

var secretKeysCounter = new mongoose.Schema({
    date: String,
    secretId: {type: ObjectId, ref: 'secretKeys'},
    counter: Number
}, {timestamps: true, versionKey: false});

var loadRequestSchema = new mongoose.Schema({
        createdBy: {type: ObjectId, ref: 'accounts'},
        accountId: {type: ObjectId, ref: 'accounts'},
        truckId: {type: ObjectId, ref: 'trucks'},
        tripLane: String,
        possibleStartDate: {type: Date},
        active: {type: Boolean, default: false},
        createdDate: {type: Date, default: new Date()},
    },
    {
        timestamps: true, versionKey:
            false
    }
);

var analyticsSchema = mongoose.Schema({
    action: String,
    remoteIp: String,
    userAgent: String,
    userAgentJSON: {},
    attrs: {accountId: {type: ObjectId, ref: 'accounts'}, body: String, success: Boolean},
    response: String
}, {timestamps: String});

var erpGpsPlans = new mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    devicePlanId: Number,
    franchiseId: Number,
    planName: String,
    durationInMonths: Number,
    status: Boolean,
    amount: Number,
    remark: String,
    plan: String,
    createdBy: {type: ObjectId, ref: 'accounts'},
    updatedBy: {type: ObjectId, ref: 'accounts'}
}, {timestamps: String});

var customerTypesSchema = mongoose.Schema({
    createdBy: {type: ObjectId, ref: 'accounts'},
    type: String,
}, {timestamps: String});

var customerLeadsSchema = mongoose.Schema({
    createdBy: {type: ObjectId, ref: 'accounts'},
    name: String,
    contactPhone: [Number],
    email: String,
    leadType: String,
    converted: {type: Boolean, default: false},
    companyName: String,
    address: String,
    city: String,
    state: String,
    pinCode: String,
    officeNumber: Number,
    erp: {type: Boolean, default: false},
    gps: {type: Boolean, default: false},
    load: {type: Boolean, default: false},
    yearInService: Number,
    operatingRoutes: [{source: String, destination: String}],
    documentType: String,
    documentFile: String,
    paymentType: String,
    loadPaymentToPayPercent: Number,
    loadPaymentAdvancePercent: Number,
    loadPaymentPodDays: Number,
    tdsDeclarationDoc: String,
    leadSource: String
}, {timestamps: String});

var accountDevicePlanHistory = new mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    accountName: String,
    deviceId: {type: ObjectId, ref: 'devices'},
    planId: {type: ObjectId, ref: 'devicePlans'},
    remark: String,
    amount: Number,
    creationTime: Date,
    startTime: String,
    expiryTime: Date,
    received: Boolean
}, {timestamps: String});

var faultyPlanhistory = new mongoose.Schema({
    accountId: String, //{type: ObjectId, ref: 'accounts'},
    deviceId: String, //{type: ObjectId, ref: 'devices'},
    planId: String, //{type: ObjectId, ref: 'devicePlans'},
    remark: String,
    amount: Number,
    creationTime: Date,
    startTime: String,
    expiryTime: Date,
    received: {type: Boolean, default: false}
}, {timestamps: String});

var keysSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    apiKey: String,
    secretKey: String,
    globalAccess: {type: Boolean, default: false}
});

var trucksTypesSchema = mongoose.Schema({
    createdBy: {type: ObjectId, ref: 'accounts'},
    title: String,
    tonnes: Number,
    mileage: Number,
    status: Boolean
}, {timestamps: String});

var goodsTypesSchema = mongoose.Schema({
    createdBy: {type: ObjectId, ref: 'accounts'},
    title: String,
    status: Boolean
}, {timestamps: String});

var loadTypesSchema = mongoose.Schema({
    createdBy: {type: ObjectId, ref: 'accounts'},
    title: String,
    status: Boolean
}, {timestamps: String});

var orderStatusSchema = mongoose.Schema({
    createdBy: {type: ObjectId, ref: 'accounts'},
    title: String,
    releaseTruck:Boolean,
    status: Boolean
}, {timestamps: String});

var truckRequestSchema = mongoose.Schema({
    createdBy: {type: ObjectId, ref: 'accounts'},
    customer: {type: ObjectId, ref: 'accounts'},
    customerType: String,
    source: String,
    leadType: String,
    destination: String,
    goodsType: String,
    truckType: String,
    date: {type: Date},
    pickupPoint: String,
    comment: String,
    expectedPrice: Number,
    trackingAvailable: String,
    insuranceAvailable: String,
    customerLeadId: {type: ObjectId, ref: 'customerLeads'}

}, {timestamps: String});

var franchiseSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    id_franchise: Number,
    fullName: String,
    account: String,
    mobile: Number,
    landLine: String,
    email: String,
    city: String,
    state: String,
    address: String,
    company: String,
    bankDetails: String,
    panCard: String,
    gst: String,
    doj: Date,
    status: Boolean,
    profilePic: String,
    createdBy: {type: ObjectId, ref: 'accounts'},
    updatedBy: {type: ObjectId, ref: 'accounts'}
}, {timestamps: true, versionKey: false});

var adminRoleSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    adminRoleId: Number,
    id_franchise: Number,
    franchiseId: {type: ObjectId, ref: 'franchise'},
    role: String,
    permissions: {
      moduleName: String,
      sectionName: String,
      view: Boolean,
      listAll: Boolean,
      add: Boolean,
      edit: Boolean,
      delete: Boolean
    },
    status: Boolean,
    createdBy: {type: ObjectId, ref: 'accounts'},
    updatedBy: {type: ObjectId, ref: 'accounts'}
}, {timestamps: true, versionKey: false});

var adminPermissionsSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    adminPermissionId: Number,
    id_admin_role: Number,
    adminRoleId: {type: ObjectId, ref: 'adminRoles'},
    moduleName: String,
    fileName: String,
    title: String,
    listAll: Boolean,
    view: Boolean,
    add: Boolean,
    edit: Boolean,
    trash: Boolean,
    fileSortOrder: Number,
    moduleSortOrder: Number,
    menuType: Number,
    status: Boolean,
    createdBy: {type: ObjectId, ref: 'accounts'},
    updatedBy: {type: ObjectId, ref: 'accounts'}
}, {timestamps: String});

var gpsSettingsSchema = mongoose.Schema({
    accountId: {type: ObjectId, ref: 'accounts'},
    idleTime: {type: Number, default: 10},
    stopTime: {type: Number, default: 15},
    overSpeedLimit: {type: Number, default: 60},
    routeNotificationInterval: {type: Number, default: 10}
});

module.exports = {
    EventDataCollection: mongoose.model('eventData', eventDataSchema, 'eventData'),
    AccountsColl: mongoose.model('accounts', accountSchema, 'accounts'),
    OperatingRoutesColl: mongoose.model('operatingRoutes', operatingRoutesSchema, 'operatingRoutes'),
    TrucksColl: mongoose.model('trucks', truckSchema, 'trucks'),
    Roles: mongoose.model('roles', rolesSchema, 'roles'),
    expenseMasterColl: mongoose.model('expenseMaster', expenseMaster, 'expenseMaster'),
    paymentsReceivedColl: mongoose.model('payments', payments, 'payments'),
    GroupsColl: mongoose.model('groups', groupSchema, 'groups'),
    OtpColl: mongoose.model('otps', otpSchema, 'otps'),
    NotificationColl: mongoose.model('notifications', notificationsSchema, 'notifications'),
    ErpSettingsColl: mongoose.model('erpsettings', erpSettingsSchema, 'erpsettings'),
    GpsColl: mongoose.model('devicePositions', devicePositions, 'devicePositions'),
    archivedDevicePositionsColl: mongoose.model('archivedDevicePositions', archivedDevicePositions, 'archivedDevicePositions'),
    SecretKeysColl: mongoose.model('secretKeys', secretKeys, 'secretKeys'),
    SecretKeyCounterColl: mongoose.model('secretKeyCounter', secretKeysCounter, 'secretKeyCounter'),
    DeviceColl: mongoose.model('devices', deviceSchema, 'devices'),
    LoadRequestColl: mongoose.model('loadRequests', loadRequestSchema, 'LoadRequests'),
    analyticsColl: mongoose.model('analytics', analyticsSchema, 'analytics'),
    erpGpsPlansColl: mongoose.model('erpGpsPlans', erpGpsPlans, 'erpGpsPlans'),
    CustomerLeadsColl: mongoose.model('customerLeads', customerLeadsSchema, 'customerLeadsSchema'),
    AccountDevicePlanHistoryColl: mongoose.model('accountDevicePlanHistory', accountDevicePlanHistory, 'accountDevicePlanHistory'),
    FaultyPlanhistoryColl: mongoose.model('faultyPlanhistory', faultyPlanhistory, 'faultyPlanhistory'),
    keysColl: mongoose.model('apiSecretKeys', keysSchema, 'apiSecretKeys'),
    TrucksTypesColl: mongoose.model('trucksTypes', trucksTypesSchema, 'trucksTypes'),
    GoodsTypesColl: mongoose.model('goodsTypes', goodsTypesSchema, 'goodsTypes'),
    LoadTypesColl: mongoose.model('loadTypes', loadTypesSchema, 'loadTypes'),
    OrderStatusColl: mongoose.model('orderStatus', orderStatusSchema, 'orderStatus'),
    TruckRequestColl: mongoose.model('truckRequests', truckRequestSchema, 'truckRequests'),
    CustomerTypesColl: mongoose.model('customerTypes', customerTypesSchema, 'customerTypes'),
    franchiseColl: mongoose.model('franchise', franchiseSchema, 'franchise'),
    adminRoleColl: mongoose.model('adminRoles', adminRoleSchema, 'adminRoles'),
    adminPermissionsColl: mongoose.model('adminPermissions', adminPermissionsSchema, 'adminPermissions'),
    GpsSettingsColl: mongoose.model('gpssettings', gpsSettingsSchema, 'gpssettings')
};
