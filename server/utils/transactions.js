const Pattern = {
  recieve: /(\w{10}) [Cc]onfirmed.You have received Ksh(.+\.\d\d) from ((.+) (\d*)\s|(.+)(\d*)\s)on (.*) at ((.*)\s(PM|AM))\s*\.?New M-PESA balance is Ksh(.+\.\d\d)/,
  send: /(\w+) Confirmed. Ksh(.+\.\d\d) sent to (.+) (\d+) on (.+) at (.+) (PM|AM). New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(.{1,3}\.\d\d)/,
  lipa: /(\w+) Confirmed. Ksh(.+\.\d\d) paid to (.+)\. on (.+) at ((.+) (AM|PM)).New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(.{1,3}\.\d\d)/,
  pay: /(\w{10}) Confirmed\. Ksh(.+\.\d\d) sent to (.+) for account (.*)\s?on(.{6,9}) at ((\d\d?:\d\d) (AM|PM))\.? New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(.{1,3}\.\d\d?)/,
  airtime: /(\w{10,12}) confirmed\.You bought Ksh(.+\.\d\d) of airtime on (.+) at (\d\d?:\d\d (AM|PM))\.New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, /,
  withdraw: /(\w{0,12})\s[C,c]onfirmed.on (.{0,8}) at (\d\d?:\d\d (PM|AM))Withdraw Ksh(.+\.\d\d) from (.+) New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(\d\d?\d?\.\d\d)\./,
  fuliza: /(\w{9,11}) [Cc]onfirmed\. Fuliza M-Pesa amount is Ksh (.+\.\d{2})\. Fee charged Ksh (\d+\.\d{2})/,
  deposit: /(\w{9,11}) Confirmed\. On (.{5,8}) at (.+ (PM|AM)) Give Ksh(.+\.\d\d) cash to (.+) New M-PESA balance is Ksh(.+\.\d\d)/,
}
const Transaction = require('../models/transactions')

var convertToDate = (time, date) => {
  time = time.trim()
  date = date.trim()
  let am = time.slice(time.indexOf(' ') + 1),
    hr = time.slice(0, time.indexOf(':')),
    min = time.slice(time.indexOf(':') + 1, time.indexOf(' '))
  let hrTime =
    am == 'AM'
      ? Number(hr) == 12
        ? 0
        : Number(hr)
      : Number(hr) == 12
      ? 12
      : Number(hr) + 12
  console.log(hrTime)
  let calendar = date.split('/')
  return new Date(
    '20' + calendar[2],
    Number(calendar[1]) - 1,
    calendar[0],
    hrTime,
    min,
  )
}

var convertToNumber = (number) => {
  // we remove the cent first
  return Number(number.replaceAll(',', ''))
}

class RecieveMoney {
  constructor(message, _id, user_id) {
    this.pattern = /(\w{10}) [Cc]onfirmed.You have received Ksh(.+\.\d\d) from ((.+) (\d*)\s|(.+)(\d*)\s)on (.*) at ((.*)\s(PM|AM))\s*\.?New M-PESA balance is Ksh(.+\.\d\d)/
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      //work out the date
      let transaction_date = convertToDate(res[9], res[8])
      let a = convertToNumber(res[2]),
        b = convertToNumber(res[12])
      // we add the data

      let newTransaction = new Transaction({
        type: 'Recieve Money',
        message_id: this._id,
        transaction_code: res[1],
        transaction_amount: a,
        subject: res[4],
        subject_phoneNumber: res[5],
        balance: b,
        dateTime: transaction_date,
        user_id: this.u_id,
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

class SendMoney {
  constructor(message, _id, user_id) {
    this.pattern = /(\w+) Confirmed. Ksh(.+\.\d\d) sent to (.+) (\d+) on (.+) at ((.+) (PM|AM)). New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(.{1,3}\.\d\d)/
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      let transaction_date = convertToDate(res[6], res[5])
      let a = convertToNumber(res[2]),
        b = convertToNumber(res[9])
      let newTransaction = new Transaction({
        type: 'Send Money',
        message_id: this._id,
        user_id: this.u_id,
        transaction_code: res[1],
        transaction_amount: a,
        subject: res[3],
        subject_phoneNumber: res[4],
        dateTime: transaction_date,
        balance: b,
        transaction_cost: res[10],
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

class lipaNaMpesa {
  constructor(message, _id, user_id) {
    this.pattern = /(\w+) Confirmed. Ksh(.+\.\d\d) paid to (.+)\. on (.+) at ((.+) (AM|PM)).New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(.{1,3}\.\d\d)/
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      let transaction_date = convertToDate(res[5], res[4])
      let a = convertToNumber(res[2]),
        b = convertToNumber(res[8])
      let newTransaction = new Transaction({
        type: 'Lipa na MPESA',
        message_id: this._id,
        user_id: this.u_id,
        transaction_code: res[1],
        transaction_amount: a,
        subject: res[3],
        dateTime: transaction_date,
        balance: b,
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

class PayBillMoney {
  constructor(message, _id, user_id) {
    this.pattern = /(\w{10}) Confirmed\. Ksh(.+\.\d\d) sent to (.+) for account (.*)\s?on(.{6,9}) at ((\d\d?:\d\d) (AM|PM))\.? New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(.{1,3}\.\d\d?)/
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      let transaction_date = convertToDate(res[6], res[5])
      let a = convertToNumber(res[2]),
        b = convertToNumber(res[10]),
        c = convertToNumber(res[9])
      let newTransaction = new Transaction({
        type: 'Pay Bill Money',
        message_id: this._id,
        user_id: this.u_id,
        transaction_code: res[1],
        transaction_amount: a,
        subject: res[3],
        subject_account: res[4],
        dateTime: transaction_date,
        balance: c,
        transaction_cost: b,
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

class AirtimeMoney {
  constructor(message, _id, user_id) {
    this.pattern = /(\w{10,12}) confirmed\.You bought Ksh(.+\.\d\d) of airtime on (.+) at (\d\d?:\d\d (AM|PM))\.New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, /
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      let transaction_date = convertToDate(res[4], res[3])
      let a = convertToNumber(res[2]),
        b = convertToNumber(res[6])
      let newTransaction = new Transaction({
        type: 'Airtime',
        user_id: this.u_id,
        message_id: this._id,
        transaction_code: res[1],
        transaction_amount: a,
        dateTime: transaction_date,
        balance: b,
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

class WithdrawMoney {
  constructor(message, _id, user_id) {
    this.pattern = /(\w{0,12})\s[C,c]onfirmed.on (.{0,8}) at (\d\d?:\d\d (PM|AM))Withdraw Ksh(.+\.\d\d) from (.+) New M-PESA balance is Ksh(.+\.\d\d)\. Transaction cost, Ksh(\d?\d?\d\.\d\d)\./
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      let transaction_date = convertToDate(res[3], res[2])
      let a = convertToNumber(res[5]),
        b = convertToNumber(res[7])
      let newTransaction = new Transaction({
        type: 'Withdraw',
        message_id: this._id,
        user_id: this.u_id,
        transaction_code: res[1],
        dateTime: transaction_date,
        transaction_amount: a,
        location: res[6],
        balance: b,
        transaction_cost: res[8],
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

class FulizaMoney {
  constructor(message, _id, user_id) {
    this.pattern = /(\w{9,11}) [Cc]onfirmed\. Fuliza M-Pesa amount is Ksh (.+\.\d{2})\. Fee charged Ksh (\d+\.\d{2})/
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      let a = convertToNumber(res[2])
      let newTransaction = new Transaction({
        type: 'Fuliza',
        message_id: this._id,
        user_id: this.u_id,
        transaction_code: res[1],
        transaction_amount: a,
        transaction_cost: res[3],
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

class DepositMoney {
  constructor(message, _id, user_id) {
    this.pattern = /(\w{9,11}) Confirmed\. On (.{5,8}) at (\d\d?:\d\d (PM|AM)) Give Ksh(.+\.\d\d) cash to (.+) New M-PESA balance is Ksh(.+\.\d\d)/
    this.message = message
    this._id = _id
    this.u_id = user_id
  }

  newTransaction() {
    // extract info
    let res = this.message.match(this.pattern)
    if (res != null) {
      let a = convertToNumber(res[5]),
        b = convertToNumber(res[7])
      let transaction_date = convertToDate(res[3], res[2])
      let newTransaction = Transaction({
        type: 'Deposit',
        message_id: this._id,
        user_id: this.u_id,
        transaction_code: res[1],
        dateTime: transaction_date,
        transaction_amount: a,
        location: res[6],
        balance: b,
      })
      newTransaction.save().catch((err) => {
        console.log(err)
      })
    }
  }
}

const test = (message, _id, user_id) => {
  let isUploaded = false
  for (const [key, value] of Object.entries(Pattern)) {
    var isMatch = message.match(value) != null
    if (!isMatch) {
      continue
    }
    isUploaded = true
    var Rep
    switch (key) {
      case 'recieve':
        Rep = RecieveMoney
        break
      case 'send':
        Rep = SendMoney
        break
      case 'lipa':
        Rep = lipaNaMpesa
        break
      case 'pay':
        Rep = PayBillMoney
        break
      case 'airtime':
        Rep = AirtimeMoney
        break
      case 'withdraw':
        Rep = WithdrawMoney
        break
      case 'fuliza':
        Rep = FulizaMoney
        break
      case 'deposit':
        Rep = DepositMoney
        break
    }
    let data = new Rep(message, _id, user_id).newTransaction()
  }
  if (!isUploaded) {
    console.error("Message couldn't be read ", message)
  }
}

module.exports = test
