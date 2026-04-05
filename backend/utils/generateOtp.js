const generateOtp = (length = 6) => {
  const size = Number(length);

  if (!Number.isInteger(size) || size < 4) {
    throw new Error("OTP length must be an integer greater than or equal to 4");
  }

  const min = 10 ** (size - 1);
  const max = (10 ** size) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

export default generateOtp;
