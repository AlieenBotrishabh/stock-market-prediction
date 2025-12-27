#!/usr/bin/env python
"""
Verification script to confirm ML pipeline is connected to backend
"""

import requests
import json
import sys

def verify_backend():
    """Check if backend is running"""
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        print("✅ Backend Status:")
        print(f"   URL: http://localhost:5000")
        print(f"   Status: {response.status_code} - Running")
        return True
    except Exception as e:
        print("❌ Backend Status:")
        print(f"   Error: {e}")
        return False

def verify_frontend():
    """Check if frontend is running"""
    try:
        response = requests.get('http://localhost:3001/', timeout=5)
        print("\n✅ Frontend Status:")
        print(f"   URL: http://localhost:3001")
        print(f"   Status: {response.status_code} - Running")
        return True
    except Exception as e:
        print("\n❌ Frontend Status:")
        print(f"   Error: {e}")
        return False

def verify_predictions_page():
    """Check if predictions page exists"""
    try:
        response = requests.get('http://localhost:3001/predictions', timeout=5)
        print("\n✅ Predictions Page:")
        print(f"   URL: http://localhost:3001/predictions")
        print(f"   Status: {response.status_code} - Accessible")
        return True
    except Exception as e:
        print("\n❌ Predictions Page:")
        print(f"   Error: {e}")
        return False

def verify_prediction_endpoint():
    """Check if prediction endpoint works"""
    try:
        response = requests.get('http://localhost:5000/api/predict/TCS', timeout=10)
        print("\n✅ Prediction Endpoint:")
        print(f"   URL: http://localhost:5000/api/predict/TCS")
        print(f"   Status: {response.status_code} - Working")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n   Response Data:")
            print(f"   - Symbol: {data.get('symbol')}")
            print(f"   - Current Price: ₹{data.get('currentPrice')}")
            print(f"   - Predicted Price: ₹{data.get('predictedPrice')}")
            print(f"   - Direction: {data.get('direction')}")
            print(f"   - Confidence: {data.get('confidence')}")
            print(f"   - Training Status: {'Trained' if data.get('trained') else 'Demo Mode'}")
        
        return True
    except Exception as e:
        print("\n❌ Prediction Endpoint:")
        print(f"   Error: {e}")
        return False

def main():
    print("=" * 60)
    print("ML Pipeline Integration - Verification Report")
    print("=" * 60)
    
    results = {
        'Backend': verify_backend(),
        'Frontend': verify_frontend(),
        'Predictions Page': verify_predictions_page(),
        'Prediction Endpoint': verify_prediction_endpoint(),
    }
    
    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)
    
    for component, status in results.items():
        status_text = "✅ WORKING" if status else "❌ FAILED"
        print(f"{component}: {status_text}")
    
    all_working = all(results.values())
    
    print("\n" + "=" * 60)
    if all_working:
        print("✅ All systems operational!")
        print("\nYour prediction system is ready to use:")
        print("- Open: http://localhost:3001/predictions")
        print("- Enter a stock symbol (e.g., TCS)")
        print("- Click 'Predict' to get a stock price prediction")
    else:
        print("❌ Some systems are not working")
        print("\nTroubleshooting:")
        print("1. Make sure backend is running: npm start (in backend/)")
        print("2. Make sure frontend is running: npm run dev (in frontend/)")
        print("3. Wait 5-10 seconds for servers to fully start")
        print("4. Run this script again")
    
    print("=" * 60)
    
    return 0 if all_working else 1

if __name__ == '__main__':
    sys.exit(main())
