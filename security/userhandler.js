module.exports.verifyUser = function (user) {
    if (!user) {
        console.log('Error while querying user: user not found!');
        return false;
    }
    if(!user.active) {
        console.log('User ' + user.username + ' tries to login but is inactive - denying login!');
        return false;
    }
    if(user.attempts >= 10) {
        console.log('User ' + user.username + ' tries to login but has 10 or more failed login attempts - denying login!');
        return false;
    }
    return true;
}