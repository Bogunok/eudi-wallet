export const USER_CONTROLLER_MESSAGES = {
  GET_PROFILE: {
    SUCCESS: {
      EN: 'User profile retrieved successfully.',
    },
    NOT_FOUND: {
      EN: 'User profile not found.',
    },
  },
  CHANGE_PASSWORD: {
    SUCCESS: {
      EN: 'Password successfully changed.',
    },
    BAD_REQUEST: {
      EN: 'Invalid current password.',
    },
  },
  CHANGE_PIN: {
    SUCCESS: {
      EN: 'PIN code successfully changed.',
    },
    BAD_REQUEST: {
      EN: 'Invalid current PIN code.',
    },
  },
  CHANGE_EMAIL: {
    SUCCESS: {
      EN: 'Email successfully changed.',
    },
    BAD_REQUEST: {
      EN: 'Invalid password.',
    },
    CONFLICT: {
      EN: 'This email is already in use by another user.',
    },
  },
  GET_ONE: {
    SUCCESS: {
      EN: 'User retrieved successfully.',
    },
    NOT_FOUND: {
      EN: 'The user with the requested id was not found.',
    },
  },
  CREATE: {
    SUCCESS: {
      EN: 'User successfully created.',
    },
    CONFLICT: {
      EN: 'User with this email already exists.',
    },
  },
  UPDATE: {
    SUCCESS: {
      EN: 'User successfully updated.',
    },
    NOT_FOUND: {
      EN: 'The user with the requested id was not found.',
    },
  },
  REMOVE: {
    USER_IS_FORBIDDEN_TO_REMOVE: {
      EN: 'The user is forbidden to perform this action. You can only delete your own account.',
    },
    SUCCESS: {
      EN: 'User was successfully removed.',
    },
    NOT_FOUND: {
      EN: 'The user with the requested id was not found.',
    },
  },
  FIND_ALL: {
    SUCCESS: {
      EN: 'Users retrieved successfully.',
    },
  },
};
