// primero importas los modelos que asociaras

const User = require('./User')
const EmailCode = require('./EmailCode')


// con esto haces la asociacion 1 a 1:
EmailCode.belongsTo(User);
User.hasOne(EmailCode);