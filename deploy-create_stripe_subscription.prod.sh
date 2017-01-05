# Deploy the latest code to lambda

export OUT_DIR=output
export SRC_DIR=create-stripe-subscription
export FUNCTION_NAME=tailored-monthly-create_strip_subscription
export ZIP_FILE=$FUNCTION_NAME.zip

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/$ZIP_FILE"
zip -rj "$OUT_DIR/$ZIP_FILE" "$SRC_DIR/"

aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$OUT_DIR/$ZIP_FILE"
