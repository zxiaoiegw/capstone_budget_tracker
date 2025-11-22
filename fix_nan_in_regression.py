import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingRegressor  # This can handle NaN natively

# Create a sample dataset with NaN values
np.random.seed(42)
X = np.random.rand(100, 5)  # 100 samples, 5 features
y = 3*X[:, 0] + 2*X[:, 1] - X[:, 2] + 5 + np.random.normal(0, 0.5, 100)

# Insert some NaN values
X[np.random.choice(100, 10), np.random.choice(5, 10)] = np.nan

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Original data shape:", X_train.shape)
print("Number of NaN values in training data:", np.isnan(X_train).sum())

# ==================== SOLUTION 1: Drop rows with NaN values ====================
print("\n===== SOLUTION 1: Drop rows with NaN values =====")
# Keep only rows with no NaN values
mask_train = ~np.isnan(X_train).any(axis=1)
X_train_clean = X_train[mask_train]
y_train_clean = y_train[mask_train]

print("Clean data shape after dropping NaN rows:", X_train_clean.shape)
print("Number of rows dropped:", X_train.shape[0] - X_train_clean.shape[0])

# Train a linear regression model
model_1 = LinearRegression()
model_1.fit(X_train_clean, y_train_clean)

# For prediction, handle test data similarly
mask_test = ~np.isnan(X_test).any(axis=1)
X_test_clean = X_test[mask_test]
y_test_clean = y_test[mask_test]

if X_test_clean.shape[0] > 0:
    score_1 = model_1.score(X_test_clean, y_test_clean)
    print(f"R² score on clean test data: {score_1:.3f}")
else:
    print("No clean test data available after dropping NaN values")

# ================= SOLUTION 2: Impute NaN values with mean ===================
print("\n===== SOLUTION 2: Impute NaN values with mean =====")
# Create a pipeline with imputer and linear regression
imputer = SimpleImputer(strategy='mean')
model_2 = Pipeline([
    ('imputer', imputer),
    ('linear_regression', LinearRegression())
])

# Fit the pipeline on the data with NaN values
model_2.fit(X_train, y_train)

# Evaluate
score_2 = model_2.score(X_test, y_test)
print(f"R² score with mean imputation: {score_2:.3f}")

# ================= SOLUTION 3: Use a model that handles NaN natively ===================
print("\n===== SOLUTION 3: Use a model that handles NaN natively =====")
# HistGradientBoostingRegressor can handle NaN values natively
model_3 = HistGradientBoostingRegressor(random_state=42)
model_3.fit(X_train, y_train)

# Evaluate
score_3 = model_3.score(X_test, y_test)
print(f"R² score with HistGradientBoostingRegressor: {score_3:.3f}")

# ================= SOLUTION 4: Advanced imputation strategies ===================
print("\n===== SOLUTION 4: Advanced imputation with median and KNN =====")
# Median imputation
imputer_median = SimpleImputer(strategy='median')
model_4a = Pipeline([
    ('imputer', imputer_median),
    ('linear_regression', LinearRegression())
])
model_4a.fit(X_train, y_train)
score_4a = model_4a.score(X_test, y_test)
print(f"R² score with median imputation: {score_4a:.3f}")

# KNN imputation (if KNNImputer is available)
try:
    from sklearn.impute import KNNImputer
    imputer_knn = KNNImputer(n_neighbors=5)
    model_4b = Pipeline([
        ('imputer', imputer_knn),
        ('linear_regression', LinearRegression())
    ])
    model_4b.fit(X_train, y_train)
    score_4b = model_4b.score(X_test, y_test)
    print(f"R² score with KNN imputation: {score_4b:.3f}")
except ImportError:
    print("KNNImputer not available in this version of scikit-learn")

print("\nConclusion:")
print("There are multiple ways to handle NaN values in scikit-learn:")
print("1. Drop rows with NaN values - simple but may lose data")
print("2. Use SimpleImputer to replace NaN with mean/median/mode")
print("3. Use models that natively handle NaN values (like HistGradientBoostingRegressor)")
print("4. Use advanced imputation strategies (KNN imputation, iterative imputation)")
print("\nThe best approach depends on your specific dataset and requirements.") 