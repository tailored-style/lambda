# Deploy the latest code to lambda

export OUT_DIR=output
export SRC_DIR=send-welcome-email
export FUNCTION_NAME=tailored-monthly-staging-send_welcom_email
export ZIP_FILE=$FUNCTION_NAME.zip

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/$ZIP_FILE"
zip -rj "$OUT_DIR/$ZIP_FILE" "$SRC_DIR/"

aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$OUT_DIR/$ZIP_FILE"
